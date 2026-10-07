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
  const FILLER = /\b(i|i'd|id|i'm|im|we|we'd|want|wanna|would|like|love|need|to|buy|get|find|looking|look|for|a|an|the|some|new|cheap|cheapest|best|good|please|pls|discount|discounts|coupon|coupons|code|codes|promo|deal|deals|on|of|my|me|us|can|you|help|show)\b/gi;
  const SYNONYMS = [
    [/\bflat ?screen\b/gi, "flat screen tv"],
    [/\btelevision\b/gi, "tv"],
    [/\bfridge\b/gi, "refrigerator"],
    [/\bsneakers\b/gi, "shoes"],
    [/\bphone\b/gi, "smartphone"],
  ];
  function cleanQuery(s) {
    let q = s.toLowerCase().replace(/[^a-z0-9\s'"-]/g, " ");
    q = q.replace(FILLER, " ");
    for (const [re, to] of SYNONYMS) q = q.replace(re, to);
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

  function render() {
    if (!clean) return;
    $("#summaryQ").textContent = clean;
    $("#summaryRaw").textContent = raw;
    if (typeof LAST_VERIFIED !== "undefined") $("#verified").textContent = LAST_VERIFIED;
    summary.classList.remove("hidden");
    $("#tips").classList.remove("hidden");
    document.body.classList.add("searched");

    results.innerHTML = SOURCES.map((cat, i) => `
      <section class="category">
        <div class="cat-head">
          <div><h2>${cat.category}</h2><p>${cat.blurb}</p></div>
          <button class="ghost small open-cat" data-cat="${i}">Open all ${cat.items.length}</button>
        </div>
        <div class="grid">
          ${cat.items.map((s) => `
            <a class="card ${s.top ? "top" : ""}" href="${buildUrl(s.url, clean)}" ${targetAttr()}>
              <span class="name">${s.name}</span>
              ${s.top ? '<span class="pill">Top pick</span>' : ""}
              ${dealHtml(s.name)}
              <span class="host">${hostOf(s.url)}</span>
            </a>`).join("")}
        </div>
      </section>`).join("");
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
  const ACCESSORY = /\b(cases?|covers?|skins?|straps?|bands?|chargers?|cables?|docks?|holders?|mounts?|protectors?|sleeves?|pouch|ear ?tips|adapters?)\b/i;
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
      const e = encodeURIComponent(clean);
      $("#liveList").innerHTML = `
        <p class="muted">Nothing in the auto-tracked pool for “${esc(clean)}” yet — search the deal communities live instead:</p>
        <div class="live-fallback">
          <a class="fb" href="https://slickdeals.net/newsearch.php?q=${e}&searcharea=deals&searchin=first&sort=newest" ${targetAttr()}>🔥 Slickdeals: newest “${esc(clean)}” deals</a>
          <a class="fb" href="https://www.reddit.com/r/deals/search/?q=${e}&restrict_sr=1&sort=new" ${targetAttr()}>👾 Reddit r/deals</a>
          <a class="fb" href="https://www.dealnews.com/search.html?search=${e}" ${targetAttr()}>📰 DealNews</a>
          <a class="fb" href="https://www.google.com/search?q=${e}+deal+OR+%22promo+code%22&tbs=qdr:w" ${targetAttr()}>🔎 Google: deals this week</a>
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

  function search(text, push = true) {
    raw = text.trim();
    if (!raw) { queryInput.focus(); return; }
    clean = cleanQuery(raw);
    render();
    renderLive();
    if (push) history.replaceState(null, "", "?q=" + encodeURIComponent(raw));
    summary.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openMany(urls) {
    if (urls.length > 8 && !confirm(`This will open ${urls.length} tabs. Continue?`)) return;
    urls.forEach((u) => window.open(u, "_blank", "noopener"));
  }

  $("#searchForm").addEventListener("submit", (e) => { e.preventDefault(); search(queryInput.value); });
  newTab.addEventListener("change", () => { render(); renderLive(); });
  $("#sort").addEventListener("change", renderLive);
  $("#presets").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-q]");
    if (!b) return;
    queryInput.value = b.dataset.q;
    search(b.dataset.q);
  });
  $("#editQ").addEventListener("click", () => {
    queryInput.value = clean;
    queryInput.focus();
    queryInput.select();
    $("#hero").scrollIntoView({ behavior: "smooth" });
  });
  $("#openAll").addEventListener("click", () => {
    openMany(SOURCES.flatMap((c) => c.items.filter((s) => s.top).map((s) => buildUrl(s.url, clean))));
  });
  results.addEventListener("click", (e) => {
    const b = e.target.closest(".open-cat");
    if (!b) return;
    openMany(SOURCES[+b.dataset.cat].items.map((s) => buildUrl(s.url, clean)));
  });

  const q = new URLSearchParams(location.search).get("q");
  if (q) { queryInput.value = q; search(q, false); }
})();
