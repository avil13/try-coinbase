#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

: "${CDP_API_KEY:=./cdp_api_key.json}"
export CDP_API_KEY

if [[ -z "$CDP_API_KEY" || ! -f "$CDP_API_KEY" ]]; then
  cat <<'EOF'
Error: CDP_API_KEY is not configured.

CDP_API_KEY points to your Coinbase Developer Platform (CDP) API key file.
The server uses it to authenticate requests to the CDP Payment Acceptance API.

How to set it up:
  1. Open https://portal.cdp.coinbase.com (Sandbox for testing)
  2. Go to API Keys → Create API Key → download the JSON file
  3. Save it as cdp_api_key.json in the project root
  4. Run this script again, or export the path explicitly:

     export CDP_API_KEY=./cdp_api_key.json
     ./run.sh

Do not commit cdp_api_key.json to git.
EOF
  exit 1
fi

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting Express backend on http://localhost:3001 ..."
npm run dev:server &
SERVER_PID=$!

# Give the backend a moment to bind before Vite proxies /api requests.
sleep 1

echo "Starting Vite frontend on http://localhost:5173 ..."
npm run dev
