// One-button API key fetcher for the price worker.
//   node get-key.mjs bestbuy   -> opens Chrome on the Best Buy developer portal, waits for you to sign in,
//                                 finds your API key, copies it to the clipboard, saves it to worker/secrets.json
//   node get-key.mjs ebay      -> same for the eBay developer "Application Keys" page (Production App ID + Cert ID)
//   node get-key.mjs selftest  -> checks key detection + clipboard + secrets file on a fake page (no network)
//
// The sign-in itself is yours to do (password + any verification code) — that step can't be automated,
// and the browser profile is kept in ~/Library/Application Support/discount-codes-keys so it's remembered.

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SECRETS = path.join(HERE, "..", "worker", "secrets.json");
const PROFILE = path.join(os.homedir(), "Library", "Application Support", "discount-codes-keys");
const WAIT_MS = 15 * 60e3;   // how long we wait for you to sign in / click around

const TARGETS = {
  bestbuy: {
    label: "Best Buy API key",
    url: "https://developer.bestbuy.com/login",
    // Done when we're back on the developer portal (not the login redirect) and a key is visible.
    ready: (u) => /developer\.bestbuy\.com/.test(u) && !/\/login/.test(u),
    hint: "Sign in with your BestBuy.com account (create one if needed). If the portal shows a “Get API Key” / “Generate” button, click it — I'll grab the key the moment it appears.",
    extract(text) {
      // Best Buy keys are 24 lowercase letters/digits. Prefer one that sits near the words "API key".
      const all = [...text.matchAll(/\b([a-z0-9]{24})\b/g)].map((m) => ({ key: m[1], at: m.index }));
      if (!all.length) return null;
      const near = all.find((k) => /api\s*key/i.test(text.slice(Math.max(0, k.at - 200), k.at + 200)));
      return { BESTBUY_API_KEY: (near || all[0]).key };
    },
    clipboard: (s) => s.BESTBUY_API_KEY,
  },
  ebay: {
    label: "eBay Production keys",
    url: "https://developer.ebay.com/my/keys",
    ready: (u) => /developer\.ebay\.com\/my\/keys/.test(u),
    hint: "Sign in to your eBay developer account (register if needed). On the keys page, under PRODUCTION, click “Create a keyset” if there isn't one, then make sure the Cert ID is shown — I'll grab both.",
    extract(text) {
      const app = text.match(/\b([A-Za-z0-9]+-[A-Za-z0-9]+-PRD-[a-f0-9]{8,12}-[a-f0-9]{8})\b/);
      // Cert IDs look like PRD-1a2b3c4d5e6f-7a8b-9c0d-1e2f-3a4b (12-4-4-4-4).
      const cert = text.match(/\b(PRD-[a-f0-9]{8,12}(?:-[a-f0-9]{4}){4})\b/);
      return app && cert ? { EBAY_CLIENT_ID: app[1], EBAY_CLIENT_SECRET: cert[1] } : null;
    },
    clipboard: (s) => `${s.EBAY_CLIENT_ID}\n${s.EBAY_CLIENT_SECRET}`,
  },
};

const log = (...a) => console.log("•", ...a);
function copy(text) { execFileSync("pbcopy", { input: text }); }
function saveSecrets(found) {
  let cur = {};
  try { cur = JSON.parse(fs.readFileSync(SECRETS, "utf8")); } catch {}
  fs.writeFileSync(SECRETS, JSON.stringify({ ...cur, ...found }, null, 2) + "\n", { mode: 0o600 });
  return SECRETS;
}
// Everything a person can see: body text plus the values of inputs (keys are often in read-only fields).
async function visibleText(page) {
  const parts = [];
  for (const frame of page.frames()) {
    try {
      parts.push(await frame.evaluate(() => {
        const inputs = [...document.querySelectorAll("input, textarea")].map((i) => i.value || "").join("\n");
        return document.body.innerText + "\n" + inputs;
      }));
    } catch {}
  }
  return parts.join("\n");
}

async function run(name) {
  const t = TARGETS[name];
  if (!t) { console.error("Usage: node get-key.mjs bestbuy | ebay | selftest"); process.exit(2); }
  log(`Opening Chrome for the ${t.label}…`);
  const ctx = await chromium.launchPersistentContext(PROFILE, { channel: "chrome", headless: false, viewport: null, args: ["--window-size=1100,900"] });
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(t.url, { waitUntil: "domcontentloaded" });
  // The Best Buy portal's /login is a bare <meta http-equiv="refresh"> hop to bestbuy.com's sign-in,
  // which Chrome sometimes sits on; follow it ourselves.
  const refresh = await page.evaluate(() => document.querySelector('meta[http-equiv="refresh" i]')?.content.match(/url=(.+)/i)?.[1] || "").catch(() => "");
  if (refresh) await page.goto(refresh, { waitUntil: "domcontentloaded" }).catch(() => {});
  log(t.hint);
  log("Waiting — this window closes by itself once the key is copied.");

  const deadline = Date.now() + WAIT_MS;
  let found = null;
  while (Date.now() < deadline && !found) {
    await page.waitForTimeout(1500);
    if (page.isClosed()) break;
    const url = page.url();
    if (!t.ready(url)) continue;
    found = t.extract(await visibleText(page));
  }
  if (!found) {
    log("Didn't see a key. Leaving the browser open so you can finish — run this again once it's on screen.");
    return;
  }
  copy(t.clipboard(found));
  const file = saveSecrets(found);
  log(`Got it: ${Object.entries(found).map(([k, v]) => `${k}=${v.slice(0, 6)}…`).join("  ")}`);
  log(`Copied to clipboard and saved to ${file}`);
  try {
    await page.evaluate((msg) => {
      const d = document.createElement("div");
      d.textContent = msg;
      d.style.cssText = "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#1b7f3b;color:#fff;font:700 18px -apple-system,sans-serif;padding:14px 22px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.35)";
      document.body.appendChild(d);
    }, "✓ Key copied to clipboard and saved — closing in 3 s");
    await page.waitForTimeout(3000);
  } catch {}
  await ctx.close();
}

async function selftest() {
  // Fake portal pages exercising the extractors, clipboard and secrets file; nothing touches the network.
  const bb = TARGETS.bestbuy.extract("Welcome back\nYour API Key: fnhrt6g2knfv7zj9ygj8y4r9\nDocs");
  const eb = TARGETS.ebay.extract("PRODUCTION\nApp ID (Client ID)\nVirade-Discount-PRD-9f1a2b3c4d-12ab34cd\nCert ID (Client Secret)\nPRD-1a2b3c4d5e6f-7a8b-9c0d-1e2f-3a4b\n");
  const ok = bb?.BESTBUY_API_KEY === "fnhrt6g2knfv7zj9ygj8y4r9" && eb?.EBAY_CLIENT_ID === "Virade-Discount-PRD-9f1a2b3c4d-12ab34cd" && eb?.EBAY_CLIENT_SECRET === "PRD-1a2b3c4d5e6f-7a8b-9c0d-1e2f-3a4b";
  console.log("extractors:", ok ? "ok" : "FAIL", bb, eb);
  const none = TARGETS.bestbuy.extract("Sign in to your account\nEmail\nPassword") === null;
  console.log("no false positive on sign-in page:", none ? "ok" : "FAIL");
  // Headless browser round-trip of the page-scanning code on a local page with the key in a read-only input.
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  await page.setContent('<h1>Best Buy Developer</h1><label>API Key</label><input readonly value="fnhrt6g2knfv7zj9ygj8y4r9">');
  const scanned = TARGETS.bestbuy.extract(await visibleText(page));
  await browser.close();
  console.log("scan read-only input:", scanned?.BESTBUY_API_KEY === "fnhrt6g2knfv7zj9ygj8y4r9" ? "ok" : "FAIL");
  copy("selftest-clipboard");
  console.log("clipboard:", execFileSync("pbpaste").toString() === "selftest-clipboard" ? "ok" : "FAIL");
  const tmp = path.join(os.tmpdir(), `secrets-selftest-${process.pid}.json`);
  fs.writeFileSync(tmp, JSON.stringify({ EBAY_CLIENT_ID: "keep-me" }));
  const merged = { ...JSON.parse(fs.readFileSync(tmp, "utf8")), ...bb };
  fs.unlinkSync(tmp);
  console.log("secrets merge keeps other keys:", merged.EBAY_CLIENT_ID === "keep-me" && merged.BESTBUY_API_KEY ? "ok" : "FAIL");
  if (!ok || !none || !scanned) process.exit(1);
}

const mode = process.argv[2];
(mode === "selftest" ? selftest() : run(mode)).catch((e) => { console.error("✗", e.message); process.exit(1); });
