(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u) ? esc(u) : "#");
  const highlightNew = (s) => esc(s).replace(/\[(new)\]/gi, '<span class="tag-new">[$1]</span>');
  const results = $("#results");
  const queryInput = $("#query");
  const newTab = $("#newTab");
  const summary = $("#summary");
  let raw = "";
  let clean = "";

  // Turn "i want a sony flat screen!!" into "sony flat screen tv".
  // "to" is only filler after a verb ("want to buy") — it's part of the product in "male to male", "usb to hdmi".
  const VERB_TO = /\b(want|wanna|need|like|love|looking|going|have|trying|got)\s+to\b/gi;
  const FILLER = /\b(i|i'd|id|i'm|im|we|we'd|want|wanna|would|like|love|need|buy|get|find|looking|look|for|with|a|an|the|some|new|cheap|cheapest|best|good|please|pls|discount|discounts|coupon|coupons|code|codes|promo|deal|deals|on|of|my|me|us|can|you|help|show)\b/gi;
  const SYNONYMS = [
    [/\bflat ?screen\b/gi, "flat screen tv"],
    [/\btelevision\b/gi, "tv"],
    [/\bfridge\b/gi, "refrigerator"],
    [/\bsneakers\b/gi, "shoes"],
    [/\bphone\b/gi, "smartphone"],
  ];
  function cleanQuery(s) {
    // Catalog titles pasted from a store listing ("Epson PowerLite E20 LCD Projector - 4:3 - Ceiling
    // Mountable") carry spec segments after " - ", " | " or ",". Keep the product segment when it's
    // specific enough on its own (3+ words).
    const segs = s.split(/\s+[-–|]\s+|,\s+/).map((t) => t.trim());
    if (segs[0].split(/\s+/).length >= 3) {
      // "3.5mm aux cable - 3.5mm aux cable male to male 6ft": a later segment that restates the
      // first one is the fuller product name, so prefer it.
      s = segs.slice(1).find((t) => t.toLowerCase().includes(segs[0].toLowerCase())) || segs[0];
    }
    let q = s.toLowerCase()
      .replace(/(\d)\.(\d)/g, "$1\u0000$2")        // protect decimals: 3.5mm, 2.4ghz
      .replace(/[^a-z0-9\s'"\-\u0000]/g, " ")
      .replace(/\u0000/g, ".")
      .replace(/(^|\s)-+(?=\s|$)/g, " ")
      .replace(VERB_TO, " ");
    q = q.replace(FILLER, " ");
    for (const [re, to] of SYNONYMS) q = q.replace(re, to);
    q = q.replace(/\b(\d+) (gb|tb|mb|ghz|hz|mm|cm|in|ft|lb|oz|w|mah)\b/g, "$1$2");   // "256 gb" -> "256gb", how stores write it
    q = q.replace(/\btv tv\b/g, "tv").replace(/\s+/g, " ").trim();
    return q || s.trim();
  }

  function buildUrl(template, q) {
    return template
      .replace(/\{q\}/g, encodeURIComponent(q))
      .replace(/\{qp\}/g, q.split(/\s+/).map(encodeURIComponent).join("+"))
      .replace(/\{qd\}/g, q.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  }
  const targetAttr = () => (newTab.checked ? 'target="_blank" rel="noopener noreferrer"' : "");
  function hostOf(url) {
    try { return new URL(url.replace(/\{q[pd]?\}/g, "x")).hostname.replace(/^www\./, ""); }
    catch { return ""; }
  }

  const TYPE_LABEL = { code: "Codes", sale: "Sale", refurb: "Open-box", cashback: "Cashback", tool: "Tool", community: "Community", program: "Program" };
  function dealHtml(name) {
    const d = typeof DEALS !== "undefined" && DEALS[name];
    if (!d) return "";
    return `<span class="deal deal-${d.type}"><b>${TYPE_LABEL[d.type] || ""}</b> ${d.offer}</span>`;
  }

  // Sites index different things, so a catalog title that works at Best Buy finds nothing on
  // Slickdeals or RetailMeNot. "brand" = first word when it's a word ("epson"); "core" = brand +
  // the category noun, the last plain word that isn't a size or a modifier ("epson projector").
  const MODIFIER = /^(pro|max|plus|mini|ultra|air|lite|se|gen|edition|series|class|inch|in|ft|mm|cm|black|white|silver|gray|grey|blue|red|green|gold|new|used|refurbished|memory|ram|storage|ssd|unified|gb|tb|chip|model)$/;
  // Product lines whose coupons live under the parent brand's store ("mac" on RetailMeNot is MAC cosmetics).
  const BRAND_OF = { mac: "apple", macbook: "apple", imac: "apple", ipad: "apple", iphone: "apple", airpods: "apple", galaxy: "samsung", pixel: "google", nest: "google", chromecast: "google", fitbit: "google", bravia: "sony", playstation: "sony", ps5: "sony", soundcore: "anker", eufy: "anker", nebula: "anker", surface: "microsoft", xbox: "microsoft", kindle: "amazon", echo: "amazon", roomba: "irobot", quest: "meta", oculus: "meta", switch: "nintendo" };
  function queryFor(mode, q) {
    const w = q.split(" ");
    const brand = /^[a-z][a-z'-]*$/.test(w[0]) ? w[0] : "";
    if (mode === "brand") return BRAND_OF[brand] || brand || q;
    if (mode === "core") {
      // No category noun ("macbook air 15 inch", "galaxy s25 ultra 512gb") -> the product line, i.e. the second word.
      const cat = w.slice(1).reverse().find((t) => /^[a-z][a-z-]*$/.test(t) && !MODIFIER.test(t)) || w[1];
      return brand && w.length > 3 ? `${brand} ${cat}` : q;
    }
    return q;
  }
  const siteQuery = (s, cat) => queryFor(s.q || cat.q || "full", clean);
  const siteUrl = (s, cat) => buildUrl(s.url, siteQuery(s, cat));

  // Brand/category-specific sources (Sony Store, r/4kTV...) only show when the query is about them.
  const visibleItems = (cat) => cat.items.filter((s) => !s.only || s.only.test(clean));
  // A source with no {q} in its URL is a fixed deals hub — it can't search for the product.
  const isGenericPage = (s) => !/\{q[pd]?\}/.test(s.url);

  function render() {
    if (!clean) return;
    $("#summaryQ").textContent = clean;
    $("#summaryRaw").textContent = raw;
    $("#stickyQText").textContent = clean;
    if (typeof LAST_VERIFIED !== "undefined") $("#verified").textContent = LAST_VERIFIED;
    summary.classList.remove("hidden");
    $("#tips").classList.remove("hidden");
    document.body.classList.add("searched");

    results.innerHTML = SOURCES.map((cat, i) => {
      const items = visibleItems(cat);
      return `
      <section class="category">
        <div class="cat-head">
          <div><h2>${cat.category}</h2><p>${cat.blurb}</p></div>
          <button class="ghost small open-cat" data-cat="${i}">Open all ${items.length}</button>
        </div>
        <div class="grid">
          ${items.map((s) => `
            <a class="card ${s.top ? "top" : ""}" href="${siteUrl(s, cat)}" ${targetAttr()}>
              <span class="name">${s.name}</span>
              ${s.top ? '<span class="pill">Top pick</span>' : ""}
              ${isGenericPage(s)
                ? '<span class="q generic">General deals page — browse for your product</span>'
                : `<span class="q" title="Searches this site for “${esc(siteQuery(s, cat))}”">🔍 ${esc(siteQuery(s, cat))}</span>`}
              ${dealHtml(s.name)}
              <span class="host">${hostOf(s.url)}</span>
            </a>`).join("")}
        </div>
      </section>`;
    }).join("");
  }

  // ---- Live deals (data/live-deals.json, refreshed by GitHub Action) ----
  let LIVE = null;
  fetch("data/live-deals.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      LIVE = j;
      // Deals Slickdeals has marked expired stay in the file (so the scraper remembers the verdict) but never show.
      if (LIVE && LIVE.deals) LIVE.deals = LIVE.deals.filter((d) => d.expired !== true);
      renderLive();
    })
    .catch(() => {});

  const STOP = new Set(["tv", "the", "a", "and", "for", "with", "inch", "in", "of", "flat", "screen"]);
  function terms(q) { return q.toLowerCase().split(/\s+/).filter((t) => t && !STOP.has(t)); }
  const reEsc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hasTerm = (text, t) => new RegExp(`(^|[^a-z0-9])${reEsc(t)}(s|es)?(?![a-z0-9])`, "i").test(text);
  // Titles only (plus the store name, so "amazon airpods" works). A description can name other
  // products — a Woot fan-gear roundup lists an "AirPods Pro case" — so it never counts.
  function matchDeal(d, ts) {
    const hay = `${d.title} ${d.store || ""}`;
    return ts.every((t) => hasTerm(hay, t));
  }
  // Accessories (cases, chargers, docks...) sink to the bottom unless the search asks for one.
  // Text in parentheses is ignored (a watch lists "(Aluminum Case, Sport Band)" as its own parts),
  // and so are "charging case", "titanium case" and "wireless charging", which describe the product itself.
  const ACCESSORY = /\b(cases?|covers?|skins?|straps?|bands?|chargers?|cables?|docks?|holders?|mounts?|brackets?|protectors?|sleeves?|pouch|ear ?tips|adapters?|lamps?|bulbs?|remotes?|stands?|bags?|filters?|batter(y|ies)|replacement)\b/i;
  const isAccessory = (title) => ACCESSORY.test(title.replace(/\([^)]*\)/g, " ").replace(/\b(charging|carrying|usb-c|aluminum|titanium|steel) case\b/gi, "").replace(/\bwireless charging\b/gi, ""));
  // Close matches, used only when no deal matches every word. The title must contain all but
  // one of the words the pool knows (never fewer than two), including the rarest of them — so
  // "mac ultra studio" finds Mac Studio deals but never every Mac, and "airpods pro 2" can't
  // decay into anything that says "pro" and "2".
  function closeMatches(ts) {
    const known = ts.map((t) => [t, LIVE.deals.filter((d) => hasTerm(d.title, t)).length]).filter(([, n]) => n > 0);
    if (known.length < 2) return [];
    const rarest = known.slice().sort((a, b) => a[1] - b[1])[0][0];
    const need = Math.max(2, known.length - 1);
    return LIVE.deals.filter((d) => hasTerm(d.title, rarest) && ts.filter((t) => hasTerm(d.title, t)).length >= need);
  }
  function ago(iso) {
    const h = Math.round((Date.now() - Date.parse(iso)) / 36e5);
    return h < 1 ? "just now" : h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
  }
  const priceNum = (d) => (d.price ? Number(d.price.replace(/[$,]/g, "")) : NaN);
  function sortDeals(list, mode) {
    const arr = [...list];
    const byDate = (a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0);
    if (mode === "newest") return arr.sort(byDate);
    if (mode === "score") return arr.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || byDate(a, b));
    // Price sorts: deals without a price go last.
    return arr.sort((a, b) => {
      const pa = priceNum(a), pb = priceNum(b);
      if (isNaN(pa) && isNaN(pb)) return byDate(a, b);
      if (isNaN(pa)) return 1;
      if (isNaN(pb)) return -1;
      return mode === "price-desc" ? pb - pa : pa - pb;
    });
  }

  function renderLive() {
    const box = $("#live");
    if (!LIVE || !clean) return;
    const ts = terms(clean);
    // If the query mentions a TV, also require TV-ish words so speakers/headphones don't leak in.
    const wantsTv = /\b(tv|flat screen|television|oled|bravia)\b/i.test(clean);
    const tvOk = (d) => !wantsTv || /\b(tv|television|oled|qled|bravia|\d{2}["”]|\d{2}-?inch)\b/i.test(d.title);
    let hits = LIVE.deals.filter((d) => matchDeal(d, ts) && tvOk(d));
    const close = !hits.length;
    if (close) hits = closeMatches(ts).filter(tvOk);
    hits = sortDeals(hits, $("#sort").value);
    if (!ACCESSORY.test(clean)) hits = [...hits.filter((d) => !isAccessory(d.title)), ...hits.filter((d) => isAccessory(d.title))];
    $("#liveUpdated").textContent = LIVE.updated ? ago(LIVE.updated) : "—";
    $("#liveCount").textContent = hits.length ? `${hits.length} ${close ? "close" : "found"}` : "";
    box.classList.remove("hidden");
    if (!hits.length) {
      // Deal communities only index posted deals, so send them the brand + category ("epson projector")
      // rather than the full title, which usually finds nothing. Google gets the full product.
      const core = queryFor("core", clean), ce = encodeURIComponent(core), e = encodeURIComponent(clean);
      $("#liveList").innerHTML = `
        <p class="muted">Nothing in the auto-tracked pool for “${esc(clean)}” yet — search the deal communities live instead (searched as “${esc(core)}” so posted deals show up):</p>
        <div class="live-fallback">
          <a class="fb" href="https://slickdeals.net/search?q=${ce}&sort=price_low" ${targetAttr()}>🔥 Slickdeals: “${esc(core)}” deals, lowest price first</a>
          <a class="fb" href="https://www.reddit.com/r/deals/search/?q=${ce}&restrict_sr=1&sort=new" ${targetAttr()}>👾 Reddit r/deals: “${esc(core)}”</a>
          <a class="fb" href="https://www.dealnews.com/search.html?search=${ce}" ${targetAttr()}>📰 DealNews: “${esc(core)}”</a>
          <a class="fb" href="https://www.google.com/search?q=${e}+deal+OR+%22promo+code%22&tbs=qdr:w" ${targetAttr()}>🔎 Google: “${esc(clean)}” deals this week</a>
        </div>
        <p class="muted small">Tracked products are refreshed every 6 h. To auto-track “${esc(clean)}”, add it to <code>scraper/keywords.json</code>.</p>`;
      return;
    }
    const note = close ? `<p class="muted small">No deal matches every word of “${esc(clean)}” — these match most of it:</p>` : "";
    $("#liveList").innerHTML = note + hits.slice(0, 40).map((d) => `
      <a class="live-card" href="${safeUrl(d.url)}" ${targetAttr()}>
        <div class="live-top">
          ${d.price ? `<span class="price">${esc(d.price)}</span>` : ""}
          ${d.percentOff ? `<span class="pct">${Number(d.percentOff)}% off</span>` : ""}
          ${d.code ? `<span class="code">CODE: ${esc(d.code)}</span>` : ""}
          ${d.store ? `<span class="store">${esc(d.store)}</span>` : ""}
          <span class="src">${esc(d.source)}${d.score != null ? ` · 👍 ${Number(d.score)}` : ""}${d.date ? ` · ${ago(d.date)}` : ""}</span>
          ${d.expired === false && d.checked ? `<span class="live-ok">✓ still live ${ago(d.checked)}</span>` : ""}
        </div>
        <div class="live-title">${highlightNew(d.title)}</div>
      </a>`).join("");
  }

  // ---- Prices right now (Best Buy + eBay via the Cloudflare Worker in worker/) ----
  const PRICES_API = (typeof CONFIG !== "undefined" && CONFIG.PRICES_API ? CONFIG.PRICES_API : "").replace(/\/$/, "");
  let PRICES = null;        // last worker response
  let pricesFor = "";       // query it was fetched for
  const money = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const storeClass = (s) => s.toLowerCase().replace(/[^a-z]/g, "");

  async function loadPrices() {
    const box = $("#prices");
    box.classList.remove("hidden");
    $("#pricesHead").innerHTML = "";
    $("#pricesCount").textContent = "";
    if (!PRICES_API) {
      $("#pricesList").innerHTML = `<div class="p-setup">Live prices aren't switched on yet. Deploy the price worker and put its URL in <code>config.js</code> — steps in <code>worker/README.md</code>. Until then, the cards below search each store for you.</div>`;
      return;
    }
    const q = clean;
    pricesFor = q;
    $("#pricesList").innerHTML = '<div class="p-skel"></div><div class="p-skel"></div><div class="p-skel"></div>';
    try {
      const r = await fetch(`${PRICES_API}/search?q=${encodeURIComponent(q)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (pricesFor !== q) return;   // user already searched something else
      PRICES = j;
      renderPrices();
    } catch (err) {
      if (pricesFor !== q) return;
      PRICES = null;
      $("#pricesList").innerHTML = `<p class="muted">Couldn't reach the price service (${esc(err.message)}). The store cards below still work.</p>`;
    }
  }

  function renderPrices() {
    if (!PRICES || !clean) return;
    const store = $("#pStore").value, cond = $("#pCond").value, mode = $("#pSort").value;
    let list = PRICES.listings.filter((l) => (store === "all" || l.store === store) && (cond === "all" || l.condition === cond));
    if (mode === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (mode === "rating") list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.price - b.price);
    else list.sort((a, b) => a.price - b.price);
    // Same rule as live deals: cases, cables and mounts sink unless the search is for one.
    if (!ACCESSORY.test(clean)) list = [...list.filter((l) => !isAccessory(l.title)), ...list.filter((l) => isAccessory(l.title))];

    const all = PRICES.listings;
    const srcNote = Object.entries(PRICES.sources || {}).filter(([, s]) => !s.ok).map(([k, s]) => `${k === "bestbuy" ? "Best Buy" : "eBay"} unavailable (${s.error})`).join(" · ");
    if (!all.length) {
      $("#pricesHead").innerHTML = "";
      $("#pricesCount").textContent = "";
      $("#pricesList").innerHTML = `<p class="muted">No listings found for “${esc(clean)}” at Best Buy or eBay right now.${srcNote ? ` ${esc(srcNote)}.` : ""} Try fewer words (<button class="link" id="pFewer">search “${esc(clean.split(" ").slice(0, 3).join(" "))}”</button>) or use the store cards below.</p>`;
      const b = $("#pFewer");
      if (b) b.addEventListener("click", () => search(clean.split(" ").slice(0, 3).join(" ")));
      return;
    }

    // Product header: prices come from the main (non-accessory) listings, so a $25 mount bracket
    // never becomes the "from" price of a projector. If the search *is* for an accessory, use everything.
    const wantsAcc = ACCESSORY.test(clean);
    const main = (wantsAcc ? all : all.filter((l) => !isAccessory(l.title))).slice().sort((a, b) => a.price - b.price);
    const pool = main.length ? main : all;
    const hero = pool.find((l) => l.image) || pool[0];
    const lo = pool[0].price, hi = pool[pool.length - 1].price;
    const byStore = ["Best Buy", "eBay"].map((s) => [s, all.filter((l) => l.store === s).length]).filter(([, n]) => n);
    const newLo = pool.filter((l) => l.condition === "New").map((l) => l.price);
    const accCount = all.length - pool.length;
    $("#pricesHead").innerHTML = `
      ${hero.image ? `<img src="${safeUrl(hero.image)}" alt="">` : ""}
      <div>
        <div class="p-title">${esc(clean)}</div>
        <div class="p-from"><small>from</small>${money(lo)}${newLo.length && Math.min(...newLo) !== lo ? ` <small>· new from ${money(Math.min(...newLo))}</small>` : ""}</div>
        <div class="p-meta">${pool.length} listings${accCount ? ` (+${accCount} accessories, shown last)` : ""} · ${byStore.map(([s, n]) => `${s} ${n}`).join(" · ")} · range ${money(lo)}–${money(hi)} · updated ${PRICES.updated ? ago(PRICES.updated) : "just now"}${srcNote ? ` · ${esc(srcNote)}` : ""}</div>
      </div>`;
    $("#pricesCount").textContent = list.length === all.length ? `${all.length} listings` : `${list.length} of ${all.length}`;

    if (!list.length) { $("#pricesList").innerHTML = `<p class="muted">Nothing matches those filters.</p>`; return; }
    $("#pricesList").innerHTML = list.slice(0, 60).map((l) => `
      <a class="p-card ${isAccessory(l.title) && !ACCESSORY.test(clean) ? "accessory" : ""}" href="${safeUrl(l.url)}" ${targetAttr()}>
        ${l.image ? `<img src="${safeUrl(l.image)}" alt="" loading="lazy">` : '<div class="noimg">🛒</div>'}
        <div>
          <div class="p-name">${esc(l.title)}</div>
          <div class="p-sub">
            <span class="store ${storeClass(l.store)}">${esc(l.store)}</span>
            <span class="cond ${l.condition === "New" ? "new" : ""}">${esc(l.condition)}</span>
            ${l.rating != null ? `<span>★ ${Number(l.rating).toFixed(1)}${l.reviews ? ` (${Number(l.reviews).toLocaleString()})` : ""}</span>` : ""}
            ${l.seller ? `<span>Seller: ${esc(l.seller)}</span>` : ""}
          </div>
        </div>
        <div class="p-price">
          <span class="now">${money(l.price)}</span>
          ${l.wasPrice ? `<span class="was">${money(l.wasPrice)}</span>` : ""}
          <span class="ship">${l.shipping === 0 ? "Free shipping" : l.shipping > 0 ? `+ ${money(l.shipping)} shipping` : "Shipping at checkout"}</span>
          <span class="buy">View at ${esc(l.store)} →</span>
        </div>
      </a>`).join("");
  }
  ["#pStore", "#pCond", "#pSort"].forEach((id) => $(id).addEventListener("change", renderPrices));

  function search(text, push = true) {
    raw = text.trim();
    if (!raw) { queryInput.focus(); return; }
    clean = cleanQuery(raw);
    render();
    loadPrices();
    renderLive();
    if (push) history.replaceState(null, "", "?q=" + encodeURIComponent(raw));
    summary.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openMany(urls) {
    if (urls.length > 8 && !confirm(`This will open ${urls.length} tabs. Continue?`)) return;
    urls.forEach((u) => window.open(u, "_blank", "noopener"));
  }

  $("#searchForm").addEventListener("submit", (e) => { e.preventDefault(); search(queryInput.value); });
  newTab.addEventListener("change", () => { render(); renderPrices(); renderLive(); });
  $("#sort").addEventListener("change", renderLive);
  $("#presets").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-q]");
    if (!b) return;
    queryInput.value = b.dataset.q;
    search(b.dataset.q);
  });
  function editQuery() {
    queryInput.value = clean;
    queryInput.focus();
    queryInput.select();
    $("#hero").scrollIntoView({ behavior: "smooth" });
  }
  $("#editQ").addEventListener("click", editQuery);
  $("#stickyEdit").addEventListener("click", editQuery);
  // Keep "Searching for <product>" on screen once the summary box scrolls away.
  const stickyQ = $("#stickyQ");
  new IntersectionObserver(([entry]) => {
    stickyQ.classList.toggle("hidden", entry.isIntersecting || !clean);
  }).observe(summary);
  $("#openAll").addEventListener("click", () => {
    openMany(SOURCES.flatMap((c) => visibleItems(c).filter((s) => s.top).map((s) => siteUrl(s, c))));
  });
  results.addEventListener("click", (e) => {
    const b = e.target.closest(".open-cat");
    if (!b) return;
    const c = SOURCES[+b.dataset.cat];
    openMany(visibleItems(c).map((s) => siteUrl(s, c)));
  });

  const q = new URLSearchParams(location.search).get("q");
  if (q) { queryInput.value = q; search(q, false); }
})();
