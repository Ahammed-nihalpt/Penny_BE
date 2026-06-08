# Penny — Invoice Copilot (Backend)

> An AI copilot for non‑technical small‑business owners. Snap a photo or PDF of an invoice →
> Gemini vision extracts it → a live dashboard shows what you owe → a chat copilot named
> **Penny** runs the app for you through tools (create, edit, delete, mark paid, total up).

This repository is the **NestJS + TypeScript API and AI service**. The web client lives in the
companion repo **Penny_FE**.

---

## What Penny does

- **Conversational copilot (agentic).** Penny is a LangGraph ReAct agent, not a plain chat. She
  decides which tools to call and chains them: e.g. "mark the Acme invoice paid" →
  `query_invoices` to find the id → `mark_paid`.
- **The chat controls the app.** Penny can **create, edit, delete, mark‑paid, search, and
  summarise** invoices. Changes show up instantly on the dashboard and the live invoice panel.
- **Vision intake.** Upload an invoice image/PDF and Gemini extracts vendor, amount, category,
  invoice number, issued/due dates, and a short note — pre‑filling the form.
- **Grounded, transparent answers.** Every reply records the tools it ran and the invoices it
  touched, so answers are backed by tool results (not the model guessing) and the UI can show
  "what Penny did".
- **Per‑session memory.** Within a chat, tell Penny "my name is David" and "what's my name?"
  answers correctly. "Call me Nihal" is persisted across sessions.
- **Email a summary (via Composio).** Ask Penny to "email me my summary" and she sends an
  outstanding/overdue/paid recap to your inbox through a **Composio**-connected Gmail account.
- **Auth.** Email/password (JWT access + refresh, httpOnly refresh cookie, real logout) plus
  **Google sign‑in** (ID‑token verification).

## How it maps to the M32 brief

| Brief requirement | Where it lives |
| --- | --- |
| Chatbot using an LLM | `src/chat/agent` (LangGraph + Gemini) |
| Tools doing something impressive | `src/chat/agent/agent-tools.ts` (7 tools controlling the app) |
| Web interface, sign up / login / logout | `src/auth` + Penny_FE |
| Users can chat | `src/chat` |
| Context retained in one session | `chat.service.ts` (rolling history window → agent) |
| Above & beyond: agentic, app controlled by chat | LangGraph ReAct agent + invoice tools |
| Bonus: Google identity provider | `src/auth` (`google-auth-library`) |
| Bonus: Composio integration | `src/composio` + the `email_summary` agent tool |
| ML framework (LangChain/LangGraph) | `@langchain/langgraph`, `@langchain/google-genai` |

## Tech stack

- **NestJS** (MVC + service layer), **TypeScript**, **pnpm**
- **MongoDB Atlas** via `@nestjs/mongoose`
- **Google Gemini** (`@google/genai`) for vision extraction
- **LangGraph.js** (`@langchain/langgraph`, `@langchain/google-genai`) for the agent
- **JWT** auth (`@nestjs/jwt`, `passport-jwt`), `bcryptjs`, `@nestjs/throttler`, Google OAuth
- **Jest** unit tests, **ESLint + Prettier** (CI gate runs with `--max-warnings 0`)

## Module overview

| Module | Responsibility |
| --- | --- |
| `auth` | Signup/login/logout, JWT issue + refresh rotation, Google ID‑token verify |
| `users` | User records, preferred model + preferred name |
| `invoices` | CRUD, summary (dashboard totals), CSV export, vision upload |
| `gemini` | Gemini vision extraction with retry/back‑off |
| `chat` | Chat sessions + messages; the LangGraph agent and its tools |
| `models` | Model picker + per‑model usage tracking (free‑tier RPD awareness) |

## Getting started

### Prerequisites
- Node.js 20+, `pnpm`
- A MongoDB Atlas connection string
- A Gemini API key — free at <https://aistudio.google.com/>
- (Optional) a Google OAuth 2.0 **Web** client ID for Google sign‑in

### Setup
```bash
pnpm install
cp .env.example .env   # then fill in the values (see below)
pnpm run start         # API on http://localhost:3000/api
```

Health check: `GET /api/health` → `{ status: 'ok', db: 'connected' }`

### Useful scripts
```bash
pnpm run start         # run the API
pnpm run build         # nest build + tsc-alias
pnpm run lint          # eslint (must pass with zero warnings)
pnpm exec jest         # unit tests
```

## Environment variables

| Var | Purpose |
| --- | --- |
| `PORT` | API port (default 3000) |
| `MONGO_URI` | MongoDB Atlas SRV connection string |
| `JWT_SECRET` | Secret for signing access/refresh tokens |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL_DAYS` | Token lifetimes |
| `FRONTEND_URL` | Web origin for CORS + cookie (Vite default `http://localhost:5173`) |
| `GOOGLE_CLIENT_ID` | Google OAuth Web client ID (empty disables Google sign‑in) |
| `GEMINI_API_KEY` | Gemini key (empty disables vision + copilot) |
| `GEMINI_MODEL` | Default model (e.g. `gemini-2.5-flash-lite`) |
| `COMPOSIO_API_KEY` | Composio key (empty disables the `email_summary` tool) |
| `COMPOSIO_USER_ID` | Composio entity that owns the connected Gmail (default `default`) |

### Enabling the Composio email feature
1. Create a free key at <https://app.composio.dev> and set `COMPOSIO_API_KEY`.
2. Connect a Gmail account for the `COMPOSIO_USER_ID` entity (e.g. via `composio add gmail`).
3. Restart the API. Now "Penny, email me my summary" sends a recap through that mailbox.
   Without a key the tool stays disabled and Penny says so politely.

Secrets live only in `.env`, which is git‑ignored. Only `.env.example` (placeholders) is committed.

## Selected API endpoints

```
POST /api/auth/signup | /login | /refresh | /logout      auth
POST /api/auth/google                                    Google sign-in
GET  /api/invoices            (filter, search)           list
POST /api/invoices            create
POST /api/invoices/upload     vision extraction (multipart)
GET  /api/invoices/export     CSV
GET  /api/invoices/summary    dashboard totals
GET  /api/chat/sessions       list / create / delete
POST /api/chat/sessions/:id/messages   send (runs the agent)
GET  /api/models              list models + usage; POST /select
```

## Notes
- Files are extract‑and‑discard (the image is read for fields, not stored).
- The agent is decoupled from the rest of the app behind an interface + DI token, so the test
  suite never pulls in the LangGraph ESM module graph.
