# try-coinbase

Coinbase Payment Acceptance demo — hosted checkout in an iframe with a small Express backend.

## Prerequisites

- Node.js 20+
- A [CDP Sandbox API key](https://portal.cdp.coinbase.com) saved as `cdp_api_key.json` in the project root
- Payment Acceptance access and a merchant settlement account ID (partner onboarding required)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and fill in your merchant account ID:

```bash
cp .env.example .env
```

Edit `.env` and set `CDP_MERCHANT_ACCOUNT_ID` to your settlement account (format: `account_...`).

The server reads API credentials automatically from `cdp_api_key.json` (`id` + `privateKey`). Do not commit this file.

3. Optional — export the key path for `cdpcurl` CLI commands:

```bash
export CDP_API_KEY=./cdp_api_key.json
```

Example: list sandbox accounts to find an account ID:

```bash
cdpcurl -k $CDP_API_KEY \
  'https://sandbox.cdp.coinbase.com/platform/v2/accounts' | jq -r '.accounts[].accountId'
```

## Run

Start the backend and frontend in **two terminals**:

```bash
# Terminal 1 — Express API on http://localhost:3001
npm run dev:server

# Terminal 2 — Vite dev server on http://localhost:5173
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and click **Pay $10.00**.

Vite proxies `/api/*` to the Express server, so the CDP secret key never reaches the browser.

## How it works

1. Browser calls `POST /api/checkout` with the page origin for redirect URLs
2. Server creates a CDP payment session via `POST /v2/payment-sessions` and returns the hosted `paymentUrl`
3. Frontend loads the hosted checkout page in an iframe; success/failure is handled via redirect to `/checkout-callback.html`

## Using CDP Docs with MCP (AI assistants)

Connect an AI tool to the [Coinbase Developer Documentation](https://docs.cdp.coinbase.com) so it can search and cite current CDP content instead of guessing.

### 1. Add the CDP Docs MCP server

Server URL: `https://docs.cdp.coinbase.com/mcp`

**Cursor** — add to your MCP settings (Settings → MCP, or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "coinbase-cdp": {
      "url": "https://docs.cdp.coinbase.com/mcp"
    }
  }
}
```

You can also use the **Copy page → MCP Connect to…** or **Copy MCP Server URL** options on any [CDP docs page](https://docs.cdp.coinbase.com).

See [CDP Docs MCP](https://docs.cdp.coinbase.com/get-started/build-with-ai/docs-for-ai/cdp-docs-mcp) for full setup and troubleshooting.

### 2. Verify the connection

Ask your AI assistant:

```
What MCP tools do you have available?
```

You should see CDP documentation search tools. Then try:

```
Search the CDP docs for hosted checkout iframe redirect flow
```

### 3. Documentation index for AI tools

- **[llms.txt](https://docs.cdp.coinbase.com/llms.txt)** — doc index with links to all CDP pages (good for discovery)
- **[llms-full.txt](https://docs.cdp.coinbase.com/llms-full.txt)** — full documentation in one file (good for broad context)
- **[skill.md](https://docs.cdp.coinbase.com/skill.md)** — structured agent capabilities for CDP actions

This repo includes matching Cursor skills in `.cursor/skills/`:

| Resource | Skill | Use when |
| --- | --- | --- |
| llms.txt | `cdp-llms-index` | Finding the right CDP doc page |
| llms-full.txt | `cdp-llms-full` | Cross-product or architecture questions |
| skill.md | `cdp-skill-md` | Running CDP CLI/API workflows |

Install into Cursor automatically:

```bash
npx skills add .
```

Example prompts for this project:

```
How do I create a payment session with redirect URLs for hosted checkout?
What iframe permissions are needed for Coinbase checkout?
How do I get a merchant settlement account ID for Payment Acceptance?
```

### Notes

- **CDP Docs MCP is read-only** — it searches documentation; it does not call CDP APIs or use your API keys.
- To execute CDP API operations from an AI agent, use the [CDP CLI MCP](https://docs.cdp.coinbase.com/get-started/build-with-ai/cdp-cli/mcp) instead.

## Docs

- [Payment Acceptance overview](https://docs.cdp.coinbase.com/payments/payment-acceptance/overview)
- [Checkout (hosted + embedded)](https://docs.cdp.coinbase.com/api-reference/payment-acceptance/payments/embedded-checkout)
- [Sandbox accounts](https://docs.cdp.coinbase.com/api-reference/payment-apis/sandbox/guides/accounts)
- [CDP documentation index (llms.txt)](https://docs.cdp.coinbase.com/llms.txt)
