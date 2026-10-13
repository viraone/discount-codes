#!/bin/zsh
# Double-click me. Opens Chrome, waits for you to sign in, copies the key to the clipboard, saves it to worker/secrets.json.
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
[ -d node_modules ] || npm install --no-audit --no-fund
node get-key.mjs bestbuy
echo; read -k 1 "?Done — press any key to close."
