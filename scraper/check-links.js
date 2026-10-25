// Link rot check: opens every store card's URL for a sample query and prints the ones that fail.
// Run: node scraper/check-links.js [query]      (default query: carhartt)
// 404/410/ENOTFOUND = genuinely broken. 403 = the site blocks scripts, so it says nothing either way.
const fs = require("fs");
const src = fs.readFileSync(require("path").join(__dirname, "..", "sources.js"), "utf8") + "\nmodule.exports={SOURCES,STORES,COUPON_SITES};";
const m = { exports: {} };
new Function("module", src)(m);
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const q = process.argv[2] || "carhartt";
const build = (t) => t.replace(/\{q\}/g, encodeURIComponent(q)).replace(/\{qp\}/g, q.split(" ").join("+")).replace(/\{qd\}/g, q.replace(/[^a-z0-9]+/g, "-"));
const { SOURCES, STORES, COUPON_SITES } = m.exports;
const items = SOURCES.flatMap((c) => c.items.map((s) => ({ cat: c.category.slice(3, 20), name: s.name, url: build(s.url) })));
// Coupon sites link to store pages, not searches: check every store on every site. 403 = site blocks scripts (inconclusive).
for (const st of STORES) for (const site of COUPON_SITES) items.push({ cat: "Coupon stores", name: `${site.name} / ${st.name}`, url: site.url.replace("{d}", st.domain) });
(async () => {
  const out = [];
  let i = 0;
  async function w() {
    while (i < items.length) {
      const it = items[i++];
      try {
        const r = await fetch(it.url, { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(15000) });
        const final = new URL(r.url);
        const home = final.pathname === "/" && new URL(it.url).pathname !== "/";
        out.push({ ...it, status: r.status, home });
      } catch (e) { out.push({ ...it, status: "ERR " + (e.cause?.code || e.name) }); }
    }
  }
  await Promise.all(Array.from({ length: 6 }, w));
  out.sort((a, b) => String(a.status).localeCompare(String(b.status)));
  for (const o of out) console.log(`${String(o.status).padEnd(10)} ${o.home ? "→HOME " : "      "} ${o.name}  ${o.url}`);
})();
