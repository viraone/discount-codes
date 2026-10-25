# Discount Code Finder

A one-page GitHub Pages site that pre-searches 70+ coupon sites, retailers, cashback portals, price trackers and deal communities for any product a user types in.

**Live preview:** open `index.html` in a browser — no build step.

## Deploy to GitHub Pages

```bash
cd discount-codes
git init
git add .
git commit -m "Sony TV discount codes site"
gh repo create discount-codes --public --source=. --push
gh api -X POST repos/{owner}/discount-codes/pages -f build_type=legacy -f "source[branch]=main" -f "source[path]=/"
```

Or in the browser: push to GitHub → **Settings → Pages → Source: Deploy from branch → `main` / `/ (root)`**.

Your site will be at `https://<username>.github.io/discount-codes/`.

## Sharing a pre-filled search

Append `?q=` to the URL: `https://<username>.github.io/discount-codes/?q=Sony+BRAVIA+8+OLED`

## Updating offers

Edit `deals.js`. Each key matches a source `name`; set `offer` text and `type` (code, sale, refurb, cashback, tool, community, program). Bump `LAST_VERIFIED` when you re-check.

## Adding sources

Edit `sources.js`. Each entry is `{ name, url, top }` where `{q}` in the URL is replaced with the encoded search query. Set `top: true` to include it in the "Open all top coupon sites" button.

Coupon codes work differently: coupon sites list codes per **store**, and their own search pages are dead. The "Coupon Codes by Store" section is built from `STORES` (a store's name, domain, and a `match` regex) and `COUPON_SITES` (URL templates with `{d}` = store domain) in `sources.js`. To add a store, add one `STORES` line. Run `node scraper/check-links.js` to check every store page (a 403 only means the site blocks scripts).

## Prices right now (on-page price comparison)

The **💰 Prices right now** dashboard shows live Best Buy + eBay listings for the search, lowest price first, with image, condition, shipping, rating/seller and a buy link — so visitors compare without leaving the site. It's powered by a free Cloudflare Worker in `worker/`; setup (two free API keys, ~10 min) is in [`worker/README.md`](worker/README.md). Until `config.js` has the worker URL, the section shows a setup note instead.

## Live deals (auto-scraper)

`scraper/fetch.js` pulls fresh deals from public feeds (Slickdeals search + frontpage, Ben's Bargains, RedFlagDeals), extracts price / % off / promo code / store, and writes `data/live-deals.json`. The page shows matching posts in the **🔴 Live deals right now** section.

- **Schedule:** `.github/workflows/scrape-deals.yml` runs every 6 hours (and on demand via *Actions → Scrape live deals → Run workflow*) and commits the JSON. GitHub Pages redeploys automatically.
- **Track more products:** add keywords to `scraper/keywords.json`.
- **Run locally:** `node scraper/fetch.js` (Node 20+, no dependencies).

> After pushing, enable the workflow's write permission if needed: *Settings → Actions → General → Workflow permissions → Read and write*.
