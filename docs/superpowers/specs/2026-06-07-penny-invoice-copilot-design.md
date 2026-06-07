# Penny — Invoice Copilot · Design Spec

**Date:** 2026-06-07
**Project:** M32 Fullstack + AI capstone (~2–3 day build)
**Status:** Approved stack; v1 scope = core only

---

## 1. Summary

Penny is an AI copilot for non-technical small-business owners. The user uploads a
photo or PDF of an invoice; Gemini vision extracts structured data (vendor, amount,
due date, category); Penny files it and keeps a live dashboard of what's owed. A chat
copilot sits beside the app and controls it through real tools — querying data,
summarising, and marking invoices paid — so a chat action updates the dashboard live.

---

## 2. Scope

### v1 (committed)
- JWT email/password auth: signup, login, logout, current-user.
- Invoice upload → Gemini vision extraction → structured JSON → stored in MongoDB.
- Dashboard: metric cards + charts reading live data.
- Invoices view: list, filter (all/overdue/due/paid), search, mark-paid, CSV export.
- Copilot two-pane view: chat + a live panel that updates as the agent acts.
- Agent tools: `query_invoices`, `get_summary`, `mark_paid`.
- Session memory: sliding window of recent messages per chat session.

### Deferred to phase 2 (explicitly NOT in v1)
- Google OAuth login.
- `send_reminder` tool + Composio/Gmail email action.
- Public deployment (demo runs locally or via recorded video for v1).

### Cut entirely
- Real accounting integrations (QuickBooks/Slack).
- Multi-currency, multi-user roles.

---

## 3. Tech stack (locked)

| Layer | Choice | Notes |
|---|---|---|
| Repos | Two separate git repos: `Penny_FE`, `Penny_BE` | Shared `CLAUDE.md` in both; API types synced manually |
| Package manager | pnpm | Both repos |
| Frontend | React + Vite + TypeScript + Mantine + React Router | Feature-based folders |
| Backend | NestJS + TypeScript | Modular: Auth/Users/Invoices/Chat/Gemini |
| Database | MongoDB Atlas (M0 free) | `@nestjs/mongoose` |
| LLM | Gemini 2.5 Flash (`@google/generative-ai`) | Vision + function calling; backoff + upload throttle |
| Agent | LangGraph.js | Wired as a Nest service; tight tool schemas; pinned versions |
| Auth | JWT (email/password) | `@nestjs/passport` + `passport-jwt` |
| Charts | `@mantine/charts` | Recharts under the hood |
| Code quality | ESLint + Prettier | Configured in both repos; Prettier formats, ESLint lints (TS rules); `pnpm lint` / `pnpm format` scripts |

---

## 4. Architecture

```
Penny_FE (Vite + React + Mantine + TS) ──HTTP + JWT──► Penny_BE (NestJS)
  • Auth screens                                          ├─ AuthModule    /api/auth/*
  • Dashboard (charts)                                    ├─ InvoicesModule /api/invoices/*
  • Invoices view                                         ├─ ChatModule     /api/chat
  • Copilot (chat + live panel)                           │    └─ LangGraph agent + tools
                                                          ├─ GeminiModule (SDK wrapper)
                                                          └─ MongoDB Atlas (Mongoose)
```

Two repos → the contract between them is explicit (see §7). The Copilot live panel and
the Dashboard both read the **same** invoice collection, so an agent action
(`mark_paid`) is immediately reflected in the dashboard. This is the "app controlled by
the chat" requirement.

---

## 5. Key data flows

**Upload (direct endpoint, not an agent tool):**
FE dropzone → `POST /api/invoices/upload` (multipart file) → `InvoicesController`
(`FileInterceptor`) → `GeminiService` vision call → structured JSON →
`InvoicesService` saves Invoice → returns it. The original file is **discarded** after
extraction; only `sourceFile` (the filename string) is kept for display.

**Chat:**
FE → `POST /api/chat { sessionId, message }` → `ChatService` loads last ~10 messages for
the session → LangGraph agent runs with the 3 tools → agent decides which tool(s) to
call → Nest services execute against Mongo → Gemini phrases the result → response (text
+ any changed data) → FE updates the live panel and, if data changed, the dashboard.

---

## 6. Data models

```ts
User        { _id, name, email, passwordHash, company, createdAt }
Invoice     { _id, userId, vendor, email, amount, currency, category,
              dueDate, issuedDate, status: 'open' | 'paid', sourceFile, createdAt }
ChatMessage { _id, userId, sessionId, role: 'user' | 'assistant' | 'tool',
              content, toolName?, createdAt }
```

- Session memory = sliding window of the last ~10 `ChatMessage`s per `sessionId`,
  prepended with the system prompt + tool schemas each turn.
- `sourceFile` is a filename string only (extract-and-discard; no blob storage).
- `googleId` is added to `User` in phase 2 (OAuth).

---

## 7. API contract (FE ↔ BE)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create account, return JWT |
| POST | `/api/auth/login` | Authenticate, return JWT |
| GET | `/api/auth/me` | Current user (protected) |
| GET | `/api/invoices` | List with filter/search query params |
| POST | `/api/invoices/upload` | Multipart upload → vision extract → save |
| PATCH | `/api/invoices/:id` | Update (e.g. mark paid, edit fields) |
| GET | `/api/invoices/summary` | Dashboard metrics (outstanding/overdue/etc.) |
| GET | `/api/invoices/export` | CSV export |
| POST | `/api/chat` | `{ sessionId, message }` → agent response |

All protected routes require `Authorization: Bearer <jwt>`. DTOs + `class-validator`
enforce the contract at every boundary.

---

## 8. Error handling

- **Gemini:** exponential-backoff wrapper on all calls; upload throttle (~2/min on free
  tier); if vision returns unparseable output, surface "couldn't read this invoice — try
  a clearer photo" and let the user edit fields manually.
- **Auth:** JWT in `Authorization` header; `JwtAuthGuard` on protected routes; 401 → FE
  redirects to login.
- **Tools:** each returns structured results/errors the agent can phrase naturally
  ("no overdue invoices found").
- **Validation:** global `ValidationPipe` rejects malformed requests with 400 + details.

---

## 9. Folder structure

### Penny_BE (NestJS)
```
src/
  main.ts, app.module.ts
  common/        guards, decorators, filters, interceptors
  config/        env validation
  auth/          controller, service, strategies/, dto/
  users/         service, schemas/user.schema.ts
  invoices/      controller, service, schemas/, dto/
  chat/          controller, service, schemas/, agent/ (agent.service.ts, tools/), dto/
  gemini/        gemini.module.ts, gemini.service.ts
test/            e2e
```

### Penny_FE (React + Vite)
```
src/
  main.tsx, App.tsx, theme.ts
  lib/           api.ts (axios + JWT), types.ts (shared API types)
  auth/          AuthContext.tsx, useAuth.ts, ProtectedRoute.tsx
  features/      dashboard/, invoices/, copilot/
  components/    shared UI (AppShell, Nav)
  hooks/         shared hooks
  pages/         LoginPage, SignupPage
```

---

## 10. Testing

- **BE:** unit tests per tool (mocked Mongo), auth service/guard, vision-JSON parser;
  e2e test for `/api/chat` with a mocked Gemini.
- **FE:** component tests for the upload flow and the Copilot live-panel update on a
  mocked chat response.
- TDD followed during implementation (test-driven-development skill).

---

## 11. Build order (incremental, learn-as-you-go)

The user is building this to understand every part deeply, so we build small, runnable,
testable slices and stop to review each:

1. `Penny_BE` scaffold (NestJS + pnpm) + ESLint + Prettier config + Mongo Atlas connection + env config.
2. Auth: signup/login/me with JWT guard — testable end to end.
3. `Penny_FE` scaffold (Vite + React + TS + Mantine) + ESLint + Prettier config + auth screens wired to BE.
4. Invoices model + CRUD + list/filter/search/mark-paid + CSV export.
5. Gemini vision upload pipeline (extract → save).
6. Dashboard (summary endpoint + metric cards + charts).
7. Chat shell + `/api/chat` with session memory ("what's my name?" test).
8. LangGraph agent + tools wired so chat controls the app (Copilot two-pane).
9. Polish to the warm "Penny look".

Each step: explain why + how it connects, build, test, then move on.
