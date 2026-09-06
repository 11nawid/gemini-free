# Gemini Free

A self-hosted, **OpenAI-compatible API for Google Gemini — powered by your free Gemini web session**. No paid API key, no billing, no quotas. Gemini Free speaks Google's internal Gemini web protocol (the same one behind gemini.google.com) using the cookies from your browser, and translates standard OpenAI API calls into Gemini calls on your own machine.

It also ships with a full web app — Chat, Learn and Draw modes — built directly on top of the local API, so you can start using it the moment it boots.

## Why

The official Gemini API is pay-per-token. The Gemini **web** app is free — and Gemini Free simply bridges the two: accept OpenAI-style requests locally, forward them to your free Gemini session, and stream the response back.

## Features

- **Free Gemini, for real** — reuses the Gemini access you already have signed in at gemini.google.com. No API key, no credit card.
- **OpenAI-compatible local API** — `/api/v1/chat/completions`, `/api/v1/models`, `/api/v1/responses`. Plug in any OpenAI SDK or tool with a base URL change.
- **Latest Gemini models** — the full free-tier lineup, including deep-thinking variants and streaming responses.
- **Built-in web UI** — Chat, Learn and Draw modes on top of the local API.
- **Local-first & private** — requests go through your machine; conversation history is stored in SQLite.
- **Browser extension included** — a ready-to-install MV3 extension that relays requests through your residential connection to keep your session healthy.

## How it works

Gemini Free is an unofficial client for Google's Gemini consumer web interface. Authentication is cookie-based:

- `cookie_file` — path to a cookies file containing your `__Secure-1PSID` / `__Secure-1PSIDTS` session cookies (extract from your logged-in gemini.google.com session)
- `gemini_bl` — the current web client build label (`boq_assistant-bard-web-server_...`), embedded in every request
- `xsrf_token` / `auth_user` — optional cross-site-request token pairing

Requests are translated from the OpenAI format and delivered over the same internal `StreamGenerate` protocol the web app uses.

> **Honest caveats** — this talks to Google's web interface, not a public API. It can break when Google changes anything, and using it is governed by Google's Terms of Service. It is a personal, self-hosted tool — not a commercial product. Use at your own risk.

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & run

```bash
git clone https://github.com/11nawid/gemini-free.git
cd gemini-free
npm install

# Create your runtime config from the example
cp config.example.json config.json
```

Edit `config.json` and set:

```json
{
  "cookie_file": "./cookies.json",
  "gemini_bl": "boq_assistant-bard-web-server_20260716.08_p0"
}
```

```bash
npm run dev
```

The web app opens at `http://localhost:8081` (login: `admin@geminifree.dev` / `gemini123`) and the API is served on the same port.

## Local AI API

Gemini Free exposes an OpenAI-compatible API. By default it is open; set `api_keys` in `config.json` to require a Bearer token.

**Chat completions**

```bash
curl -X POST http://localhost:8081/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-3.6-flash",
    "messages": [
      { "role": "user", "content": "Hello!" }
    ],
    "stream": false
  }'
```

**Models list**

```bash
curl http://localhost:8081/api/v1/models
```

**Gemini-style endpoints** — `/api/v1beta/models` and `/api/v1beta/models/{model}` are also provided.

### Available models

| Model | Description |
| --- | --- |
| `gemini-3.7-flash` | Latest all-around model |
| `gemini-3.6-flash` | All-around model (default) |
| `gemini-3.5-flash` | Alias for `gemini-3.6-flash` |
| `gemini-3.5-flash-thinking` | Deep thinking mode, longest output |
| `gemini-3.1-pro` | Pro model |
| `gemini-3.1-pro-enhanced` | Pro with enhanced output (experimental) |
| `gemini-auto` | Automatic model selection |
| `gemini-3.5-flash-thinking-lite` | Dynamic thinking with adaptive depth |
| `gemini-flash-lite` | Lightweight fast model |

## Configuration

Runtime config lives in `config.json` (auto-created from defaults if missing). See `config.example.json`.

| Key | Description |
| --- | --- |
| `port` / `host` | Server binding (default `8081` / `0.0.0.0`) |
| `cookie_file` | Path to the Gemini web session cookie file |
| `gemini_bl` | Web client build label used in requests |
| `xsrf_token` / `auth_user` | Optional request-token pairing |
| `default_model` | Fallback model for API requests |
| `api_keys` | Optional list of API keys; if empty, the API is open |
| `proxy` | Optional outbound proxy |
| `retry_attempts` / `retry_delay_sec` | Upstream retry policy |
| `request_timeout_sec` | Upstream request timeout |
| `log_requests` | Enable/disable request logging |
| `temporary_chats` | Treat chats as ephemeral |

## Project Structure

```
gemini-free/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── threads/         # Thread management API
│   │   │   └── v1/              # OpenAI-compatible API
│   │   ├── chat/                # Web chat (Chat / Learn / Draw modes)
│   │   ├── login/               # Login page
│   │   └── page.tsx             # Landing page
│   ├── components/              # UI components
│   └── lib/                     # Engine, config, database
├── public/
│   └── extension/               # MV3 browser extension (cookie relay)
├── config.json                  # Runtime configuration (gitignored)
├── config.example.json          # Config template
└── scripts/                     # Build/dev helper scripts
```

## Tech Stack

- Next.js 15 · React 19 · Tailwind CSS 4
- SQLite (better-sqlite3) for local history
- TypeScript everywhere

## Disclaimer

Unofficial, reverse-engineered, and not affiliated with or endorsed by Google LLC. Uses the Gemini consumer web interface — automated access may violate Google's Terms of Service.

## License

MIT