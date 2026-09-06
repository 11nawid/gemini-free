# Gemini Free

A full-stack AI workspace with a conversational assistant for code, Firebase architectures, and interactive brainstorming. Includes a local OpenAI-compatible API you can use from any client.

## Features

- **Chat Mode**: Interactive full-stack AI pair programmer
- **Learn Mode**: Database & systems exploration with guided architecture walkthroughs
- **Draw Mode**: Visual diagramming and SVG artboard canvas
- **Local AI API**: OpenAI-compatible endpoints (`/api/v1/chat/completions`) backed by the Gemini engine
- **Local persistence**: all conversations are saved to SQLite on your machine

## Tech Stack

- Next.js 15
- React 19
- Tailwind CSS 4
- SQLite (better-sqlite3)
- Motion (Framer Motion)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/gemini-free.git

# Navigate to project directory
cd gemini-free

# Install dependencies
npm install

# Run development server
npm run dev
```

### Login

The app uses a simple local gate — use the demo credentials:

- **Email**: admin@geminifree.dev
- **Password**: gemini123

## Local AI API

Gemini Free exposes an OpenAI-compatible API. No API key is needed unless you configure `api_keys` in `config.json`.

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

**Available models**

| Model | Description |
| --- | --- |
| `gemini-3.7-flash` | Latest all-around model |
| `gemini-3.6-flash` | All-around model (default) |
| `gemini-3.5-flash` | Alias for `gemini-3.6-flash` |
| `gemini-3.5-flash-thinking` | Deep thinking mode, longest output |
| `gemini-3.1-pro` | Pro model |
| `gemini-3.1-pro-enhanced` | Pro with enhanced output (experimental) |
| `gemini-auto` | Auto model selection |
| `gemini-3.5-flash-thinking-lite` | Dynamic thinking with adaptive depth |
| `gemini-flash-lite` | Lightweight fast model |

## Database

The application uses SQLite for offline chat storage. The database file (`gemini-free.db`) is created automatically in the project root directory when you start the application.

### Database Schema

- **threads**: Stores chat thread information
- **messages**: Stores individual messages within threads

## Configuration

Runtime configuration lives in `config.json` (auto-created from defaults if missing). Key options:

- `port` / `host` — server binding (default `8081` / `0.0.0.0`)
- `default_model` — fallback model for API requests
- `api_keys` — optional list of API keys; if empty, the API is open
- `cookie_file` — path to the Gemini web cookie file used by the engine
- `log_requests` — enable/disable request logging

## Project Structure

```
gemini-free/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── threads/         # Thread management API
│   │   │   └── v1/              # OpenAI-compatible API
│   │   ├── chat/                # Main chat page
│   │   ├── login/               # Login page
│   │   └── page.tsx             # Landing page
│   ├── components/              # Reusable UI components
│   └── lib/                     # Utility functions and database
├── public/                      # Static assets
├── config.json                  # Runtime configuration
└── scripts/                     # Build/dev helper scripts
```

## License

MIT