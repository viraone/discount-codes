(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u) ? esc(u) : "#");
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
    .then((j) => { LIVE = j; renderLive(); })
    .catch(() => {});

  const STOP = new Set(["tv", "the", "a", "and", "for", "with", "inch", "in", "of", "flat", "screen"]);
  function terms(q) { return q.toLowerCase().split(/\s+/).filter((t) => t && !STOP.has(t)); }
  const reEsc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function matchDeal(d, ts) {
    const hay = `${d.title} ${d.snippet} ${d.store || ""}`.toLowerCase();
    return ts.every((t) => new RegExp(`(^|[^a-z0-9])${reEsc(t)}(s|es)?(?![a-z0-9])`, "i").test(hay));
  }
  function ago(iso) {
    const h = Math.round((Date.now() - Date.parse(iso)) / 36e5);
    return h < 1 ? "just now" : h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
  }
  function renderLive() {
    const box = $("#live");
    if (!LIVE || !clean) return;
    let ts = terms(clean);
    // If the query mentions a TV, also require TV-ish words so speakers/headphones don't leak in.
    const wantsTv = /\b(tv|flat screen|television|oled|bravia)\b/i.test(clean);
    let hits = LIVE.deals.filter((d) => matchDeal(d, ts));
    if (wantsTv) hits = hits.filter((d) => /\b(tv|television|oled|qled|bravia|\d{2}["”]|\d{2}-?inch)\b/i.test(d.title));
    if (!hits.length && ts.length > 1) hits = LIVE.deals.filter((d) => matchDeal(d, ts.slice(0, 1)));
    $("#liveUpdated").textContent = LIVE.updated ? ago(LIVE.updated) : "—";
    $("#liveCount").textContent = hits.length ? `${hits.length} found` : "";
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
    $("#liveList").innerHTML = hits.slice(0, 40).map((d) => `
      <a class="live-card" href="${safeUrl(d.url)}" ${targetAttr()}>
        <div class="live-top">
          ${d.price ? `<span class="price">${esc(d.price)}</span>` : ""}
          ${d.percentOff ? `<span class="pct">${Number(d.percentOff)}% off</span>` : ""}
          ${d.code ? `<span class="code">CODE: ${esc(d.code)}</span>` : ""}
          ${d.store ? `<span class="store">${esc(d.store)}</span>` : ""}
          <span class="src">${esc(d.source)}${d.score != null ? ` · 👍 ${Number(d.score)}` : ""}${d.date ? ` · ${ago(d.date)}` : ""}</span>
        </div>
        <div class="live-title">${esc(d.title)}</div>
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
