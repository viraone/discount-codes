// Cloudflare Worker: live prices for the Discount Code Finder page.
//   GET /search?q=<product>  ->  { query, updated, listings: [...], sources: { bestbuy, ebay } }
// Queries the Best Buy Products API and the eBay Browse API, normalizes both into one listing
// shape, and caches each query for CACHE_TTL seconds. Secrets (set with `wrangler secret put`):
//   BESTBUY_API_KEY, EBAY_CLIENT_ID, EBAY_CLIENT_SECRET
// Deploy: see worker/README.md.

const CACHE_TTL = 15 * 60;
const MAX_QUERY = 120;
const ALLOWED_ORIGIN = /^(https:\/\/[a-z0-9-]+\.github\.io|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN.test(origin) ? origin : "https://viraone.github.io",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (url.pathname !== "/search") return json({ error: "Use /search?q=product" }, 404, cors);

    const q = (url.searchParams.get("q") || "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY).toLowerCase();
    if (q.length < 2) return json({ error: "q is required" }, 400, cors);

    // One cache entry per normalized query, shared by every visitor.
    const cache = caches.default;
    const cacheKey = new Request(`https://cache.local/search?q=${encodeURIComponent(q)}`);
    const hit = await cache.match(cacheKey);
    if (hit) {
      const body = await hit.json();
      return json({ ...body, cached: true }, 200, cors);
    }

    const [bb, eb] = await Promise.allSettled([bestBuy(q, env), ebay(q, env)]);
    const sources = {
      bestbuy: bb.status === "fulfilled" ? { ok: true, count: bb.value.length } : { ok: false, error: String(bb.reason?.message || bb.reason) },
      ebay: eb.status === "fulfilled" ? { ok: true, count: eb.value.length } : { ok: false, error: String(eb.reason?.message || eb.reason) },
    };
    const listings = [...(bb.value || []), ...(eb.value || [])]
      .filter((l) => l.price > 0 && l.title)
      .sort((a, b) => a.price - b.price);
    const body = { query: q, updated: new Date().toISOString(), listings, sources };

    const res = json(body, 200, cors);
    // Only cache runs where at least one source answered, so a transient outage isn't remembered for 15 min.
    if (sources.bestbuy.ok || sources.ebay.ok) {
      ctx.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${CACHE_TTL}` } })));
    }
    return res;
  },
};

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });
}

// ---------- Best Buy ----------
// Keyword search: every word becomes its own search= clause (AND). Catalog-style queries with a
// stray word ("lcd") can match nothing, so drop words from the end until something comes back.
async function bestBuy(q, env) {
  if (!env.BESTBUY_API_KEY) throw new Error("BESTBUY_API_KEY not set");
  const words = q.split(" ").filter((w) => /^[a-z0-9.'-]+$/i.test(w));
  if (!words.length) return [];
  const show = "sku,name,salePrice,regularPrice,onSale,image,url,customerReviewAverage,customerReviewCount,condition,freeShipping,onlineAvailability";
  for (let n = words.length; n >= Math.min(2, words.length); n--) {
    const terms = words.slice(0, n).map((w) => `search=${encodeURIComponent(w)}`).join("&");
    const url = `https://api.bestbuy.com/v1/products(${terms})?apiKey=${env.BESTBUY_API_KEY}&format=json&show=${show}&sort=salePrice.asc&pageSize=50`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`Best Buy HTTP ${r.status}`);
    const j = await r.json();
    const products = (j.products || []).filter((p) => p.onlineAvailability !== false);
    if (products.length) {
      return products.map((p) => ({
        store: "Best Buy",
        title: p.name,
        price: Number(p.salePrice),
        wasPrice: p.onSale && p.regularPrice > p.salePrice ? Number(p.regularPrice) : null,
        condition: /refurb/i.test(p.condition || "") ? "Refurbished" : /pre-?owned|used/i.test(p.condition || "") ? "Used" : "New",
        image: p.image || null,
        url: p.url,
        rating: p.customerReviewAverage ?? null,
        reviews: p.customerReviewCount ?? null,
        shipping: p.freeShipping ? 0 : null,
        seller: null,
      }));
    }
  }
  return [];
}

// ---------- eBay ----------
let ebayToken = { value: null, exp: 0 };
async function ebayAccessToken(env) {
  if (ebayToken.value && Date.now() < ebayToken.exp) return ebayToken.value;
  const r = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`),
    },
    body: "grant_type=client_credentials&scope=" + encodeURIComponent("https://api.ebay.com/oauth/api_scope"),
  });
  if (!r.ok) throw new Error(`eBay auth HTTP ${r.status}`);
  const j = await r.json();
  ebayToken = { value: j.access_token, exp: Date.now() + (Number(j.expires_in || 7200) - 60) * 1000 };
  return ebayToken.value;
}

async function ebay(q, env) {
  if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET) throw new Error("EBAY_CLIENT_ID / EBAY_CLIENT_SECRET not set");
  const token = await ebayAccessToken(env);
  const params = new URLSearchParams({
    q,
    limit: "50",
    sort: "price",
    filter: "buyingOptions:{FIXED_PRICE},deliveryCountry:US,priceCurrency:USD,itemLocationCountry:US",
  });
  const r = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      "X-EBAY-C-ENDUSERCTX": "contextualLocation=country%3DUS%2Czip%3D98101",
      Accept: "application/json",
    },
  });
  if (!r.ok) throw new Error(`eBay HTTP ${r.status}`);
  const j = await r.json();
  return (j.itemSummaries || []).map((it) => {
    const ship = it.shippingOptions?.[0];
    const cond = it.condition || "";
    return {
      store: "eBay",
      title: it.title,
      price: Number(it.price?.value),
      wasPrice: it.marketingPrice?.originalPrice?.value ? Number(it.marketingPrice.originalPrice.value) : null,
      condition: /new/i.test(cond) && !/open box|refurb/i.test(cond) ? "New" : /refurb/i.test(cond) ? "Refurbished" : /open box/i.test(cond) ? "Open box" : "Used",
      image: it.thumbnailImages?.[0]?.imageUrl || it.image?.imageUrl || null,
      url: it.itemAffiliateWebUrl || it.itemWebUrl,
      rating: null,
      reviews: null,
      shipping: ship?.shippingCost ? Number(ship.shippingCost.value) : ship?.shippingCostType === "CALCULATED" ? null : 0,
      seller: it.seller?.username ? `${it.seller.username}${it.seller.feedbackPercentage ? ` (${it.seller.feedbackPercentage}% positive)` : ""}` : null,
    };
  });
}
