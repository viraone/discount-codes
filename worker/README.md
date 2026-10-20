# Price worker

A Cloudflare Worker (free tier) that gives the page live listings so visitors never leave the site.
`GET /search?q=epson powerlite e20` returns Best Buy + eBay listings sorted lowest to highest.

## Fastest way: the two buttons in `tools/`

Double-click **`tools/Get Best Buy Key.command`** → Chrome opens on Best Buy's sign-in. Sign in (or create a BestBuy.com account), click "Get API Key" if the portal asks, and the script copies the key to your clipboard and saves it to `worker/secrets.json`, then closes. **`tools/Get eBay Keys.command`** does the same for the eBay Production App ID + Cert ID. Then skip to step 3.

## One-time setup (about 10 minutes, all free)

### 1. Best Buy API key
1. Go to https://developer.bestbuy.com/ → **Get API Key** and sign up.
2. The key is emailed / shown on the dashboard. Copy it.

### 2. eBay app keys
1. Go to https://developer.ebay.com/ → **Register** (free developer account).
2. **Your Account → Application Keys** → under **Production**, click **Create a keyset**.
3. Copy the **App ID (Client ID)** and **Cert ID (Client Secret)**.

### 3. Cloudflare + deploy
```bash
cd worker
npx wrangler login                      # opens the browser; create a free Cloudflare account if asked
npx wrangler secret put BESTBUY_API_KEY
npx wrangler secret put EBAY_CLIENT_ID
npx wrangler secret put EBAY_CLIENT_SECRET
npx wrangler deploy                     # prints https://discount-prices.<your-subdomain>.workers.dev
```

### 4. Point the page at it
Put the printed URL in `config.js` at the repo root:
```js
const CONFIG = { PRICES_API: "https://discount-prices.<your-subdomain>.workers.dev" };
```
Commit and push. The **💰 Prices right now** dashboard then shows for every search.

## Test it
```bash
curl "https://discount-prices.<your-subdomain>.workers.dev/search?q=airpods%20pro%202" | head -c 600
```
`sources.bestbuy.ok` / `sources.ebay.ok` tell you which key is working; an `error` string names the problem.

## Notes
- Results are cached per query for 15 minutes, so the free quotas (Best Buy ~50k/day, eBay 5k/day) go a long way.
- Only `checkoutcheat.com`, `*.vercel.app`, `*.github.io` and `localhost` origins are allowed to call it from a browser.
- To run it locally: `npx wrangler dev` (uses the same secrets after `wrangler secret put`, or a `.dev.vars` file).
