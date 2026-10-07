// Pulls live deals from public feeds, checks which Slickdeals deals have expired, and writes data/live-deals.json.
// Node 20+, no dependencies. Run: node scraper/fetch.js   (VERIFY_MAX=20 caps the expiry checks for a quick local run)
const fs = require("fs");
const path = require("path");

const UA = "Mozilla/5.0 (compatible; discount-codes-bot/1.0; +https://github.com)";
const KEYWORDS = JSON.parse(fs.readFileSync(path.join(__dirname, "keywords.json"), "utf8"));
const OUT = path.join(__dirname, "..", "data", "live-deals.json");
const MAX_AGE_DAYS = 45;
// Expiry checks (Slickdeals only): a deal still marked live is re-read every RECHECK_HOURS,
// never-checked deals go first, an expired verdict is final, and a run stops checking after
// VERIFY_BUDGET_MS so the job stays short; whatever is left keeps its last verdict until next run.
const RECHECK_HOURS = 11;
const VERIFY_WORKERS = 4;
const VERIFY_BUDGET_MS = 15 * 60e3;
const VERIFY_MAX = Number(process.env.VERIFY_MAX) || Infinity;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
  .trim();
const strip = (html) => decode(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? m[1] : "";
};

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function parseRss(xml) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return items.map((it) => ({
    title: strip(tag(it, "title")),
    link: decode(tag(it, "link")),
    body: strip(tag(it, "content:encoded") || tag(it, "description")),
    date: tag(it, "pubDate"),
  }));
}
function parseAtom(xml) {
  const items = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  return items.map((it) => {
    const href = (it.match(/<link[^>]*href="([^"]+)"/) || [])[1] || "";
    return { title: strip(tag(it, "title")), link: decode(href), body: strip(tag(it, "content") || tag(it, "summary")), date: tag(it, "updated") || tag(it, "published") };
  });
}

const PRICE_RE = /\$\s?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)/;
const CODE_RE = /\b(?:code|coupon|promo(?:\s*code)?)[:\s]+["']?([A-Z0-9]{4,20})["']?/i;
const PCT_RE = /(\d{1,2})\s?%\s?off/i;
const STORE_RE = /\b(best ?buy|amazon|walmart|target|costco|sam'?s club|b&h|adorama|newegg|ebay|woot|dell|lenovo|abt|crutchfield)\b/i;

function enrich(item, source) {
  const text = `${item.title} ${item.body}`;
  const price = text.match(PRICE_RE);
  const code = text.match(CODE_RE);
  const pct = text.match(PCT_RE);
  const store = text.match(STORE_RE);
  const score = (item.body.match(/Thumb Score:\s*\+?(-?\d+)/) || [])[1];
  return {
    source,
    title: item.title,
    url: item.link,
    price: price ? `$${price[1]}` : null,
    code: code ? code[1].toUpperCase() : null,
    percentOff: pct ? Number(pct[1]) : null,
    store: store ? store[1].replace(/\s+/g, " ") : null,
    score: score ? Number(score) : null,
    date: item.date && !isNaN(Date.parse(item.date)) ? new Date(item.date).toISOString() : null,
    snippet: item.body.replace(/^Thumb Score:\s*\+?-?\d+\s*/, "").slice(0, 220),
  };
}

// --- Expiry. Slickdeals marks a dead deal in the page head: <meta name="expired" content="yes">.
// Only the head is read; returning from the loop cancels the rest of the download.
async function readExpired(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20e3) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const dec = new TextDecoder();
  let html = "";
  for await (const chunk of res.body) {
    html += dec.decode(chunk, { stream: true });
    const m = html.match(/<meta[^>]*name="expired"[^>]*content="(yes|no)"/);
    if (m) return m[1] === "yes";
    if (html.includes("</head>") || html.length > 2e6) break;
  }
  throw new Error("no expired marker");
}

// Verdicts from the previous run, keyed by URL, so most deals are not re-read every run.
function previousStatus() {
  try {
    const prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
    return new Map(prev.deals.filter((d) => d.checked).map((d) => [d.url.split("?")[0], { expired: d.expired, checked: d.checked }]));
  } catch {
    return new Map();
  }
}

async function verify(deals) {
  const prev = previousStatus();
  for (const d of deals) {
    const p = prev.get(d.url);
    d.expired = p ? p.expired : null;
    d.checked = p ? p.checked : null;
  }
  const started = Date.now();
  const due = deals
    .filter((d) => /^https:\/\/slickdeals\.net\/f\//.test(d.url) && d.expired !== true && (!d.checked || started - Date.parse(d.checked) > RECHECK_HOURS * 36e5))
    .sort((a, b) => (Date.parse(a.checked) || 0) - (Date.parse(b.checked) || 0))
    .slice(0, VERIFY_MAX);
  let next = 0, read = 0, failed = 0, streak = 0;
  async function worker() {
    // 15 failures in a row means Slickdeals is refusing us; stop rather than hammer it.
    while (next < due.length && Date.now() - started < VERIFY_BUDGET_MS && streak < 15) {
      const d = due[next++];
      try {
        d.expired = await readExpired(d.url);
        d.checked = new Date().toISOString();
        read++;
        streak = 0;
      } catch (e) {
        failed++;
        streak++;
        if (failed <= 5) console.warn(`✗ expiry check ${d.url}: ${e.message}`);
      }
      await sleep(250);
    }
  }
  await Promise.all(Array.from({ length: VERIFY_WORKERS }, worker));
  const left = due.length - next;
  const expired = deals.filter((d) => d.expired === true).length;
  console.log(`\nExpiry check: ${read} read, ${failed} failed, ${left} left for next run, ${expired} expired in pool (${Math.round((Date.now() - started) / 1e3)}s)`);
  return { read, failed, left, expired };
}

const FEEDS = [
  { source: "Slickdeals", kind: "rss", perKeyword: true, url: (k) => `https://slickdeals.net/newsearch.php?q=${encodeURIComponent(k)}&searcharea=deals&searchin=first&rss=1` },
  { source: "Slickdeals Frontpage", kind: "rss", url: () => "https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1" },
  { source: "Ben's Bargains", kind: "rss", url: () => "https://bensbargains.com/rss/" },
  { source: "RedFlagDeals", kind: "atom", url: () => "https://forums.redflagdeals.com/feed/forum/9" },
];

(async () => {
  const seen = new Set();
  const deals = [];
  const errors = [];
  for (const f of FEEDS) {
    const keys = f.perKeyword ? KEYWORDS : [null];
    for (const k of keys) {
      const url = f.url(k);
      try {
        const xml = await get(url);
        const items = f.kind === "atom" ? parseAtom(xml) : parseRss(xml);
        for (const it of items) {
          const link = it.link.split("?")[0]; // drop utm_* so one thread from two feeds counts once
          if (!it.title || !link || seen.has(link)) continue;
          seen.add(link);
          const d = enrich({ ...it, link }, f.source);
          if (d.date && Date.now() - Date.parse(d.date) > MAX_AGE_DAYS * 864e5) continue;
          d.keyword = k;
          deals.push(d);
        }
        console.log(`✓ ${f.source}${k ? ` [${k}]` : ""}: ${items.length}`);
      } catch (e) {
        errors.push(`${f.source}${k ? ` [${k}]` : ""}: ${e.message}`);
        console.warn(`✗ ${f.source}${k ? ` [${k}]` : ""}: ${e.message}`);
      }
      await sleep(600);
    }
  }
  deals.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  const checks = await verify(deals);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), keywords: KEYWORDS, count: deals.length, live: deals.length - checks.expired, checks, errors, deals }, null, 1));
  console.log(`Wrote ${deals.length} deals → ${path.relative(process.cwd(), OUT)}${errors.length ? ` (${errors.length} feed errors)` : ""}`);
})();
