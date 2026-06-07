# Penny_BE Foundation — Part 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a runnable NestJS + TypeScript backend (`Penny_BE`) with pnpm, ESLint + Prettier, validated env config, a MongoDB Atlas connection, and a health endpoint — the foundation every later module builds on.

**Architecture:** NestJS app bootstrapped with the Nest CLI. A global `/api` prefix and a global `ValidationPipe`. `@nestjs/config` loads and validates env vars at startup; `@nestjs/mongoose` opens the Atlas connection from those vars. A tiny `HealthModule` proves the app boots and the DB is reachable.

**Tech Stack:** NestJS, TypeScript, pnpm, `@nestjs/config`, `@nestjs/mongoose` + mongoose, MongoDB Atlas (M0), ESLint, Prettier.

> **Note on testing style:** Part 1 is project scaffolding/wiring, not business logic, so verification is "boot it and observe" (lint passes, app starts, health endpoint returns OK, DB connects) rather than unit TDD. Real test-first TDD starts in Part 2 (Auth).

> **Environment:** Windows + PowerShell. Run commands from the `Penny_BE` repo root. The repo already contains `.git` and a Node `.gitignore` — preserve both.

> **Commits:** The USER runs all `git` commits — Claude must NOT commit. The `git commit` lines in the steps below are *suggested messages* for the user to run at each checkpoint (or batch as they prefer). Claude may `git add`/stage only if asked.

---

### Task 1: Scaffold the NestJS app into the existing repo

**Files:**
- Create: full Nest project tree (`src/`, `package.json`, `tsconfig*.json`, `nest-cli.json`, `eslint.config.mjs`, `.prettierrc`)
- Preserve: existing `.git/`, existing `.gitignore`

- [ ] **Step 1: Scaffold with the Nest CLI into a temp folder (the repo dir isn't empty)**

`nest new .` refuses a non-empty directory, so scaffold into a temp subfolder, then move files up — keeping the existing `.git` and `.gitignore`.

Run:
```powershell
pnpm dlx @nestjs/cli@latest new _scaffold --package-manager pnpm --skip-git
```
Expected: a `_scaffold/` folder containing a complete NestJS project (it will run `pnpm install` inside it).

- [ ] **Step 2: Move the scaffold up into the repo root, then delete the temp folder**

Run:
```powershell
Get-ChildItem -Path _scaffold -Force | Where-Object { $_.Name -ne '.git' } | ForEach-Object { Move-Item -Path $_.FullName -Destination . -Force }
Remove-Item _scaffold -Recurse -Force
```
Expected: `src/`, `package.json`, `nest-cli.json`, `tsconfig.json`, `eslint.config.mjs`, etc. now sit at the repo root. The scaffold's `.gitignore` may have overwritten ours — that's fine, Nest's is a superset for a Node project.

- [ ] **Step 3: Verify the app boots**

Run:
```powershell
pnpm run start
```
Expected: logs end with `Nest application successfully started`. Stop it with Ctrl+C.

- [ ] **Step 4: Verify lint + format tooling works (ships with the scaffold)**

Run:
```powershell
pnpm run lint; pnpm exec prettier --check "src/**/*.ts"
```
Expected: lint exits 0 (it auto-fixes); prettier reports files are formatted (or lists files to format — we'll fix in Task 2).

- [ ] **Step 5: Commit the scaffold**

```powershell
git add -A
git commit -m "chore: scaffold NestJS app with pnpm"
```

---

### Task 2: Pin tooling config (ESLint + Prettier + scripts)

**Files:**
- Create: `.prettierrc`
- Modify: `package.json` (scripts)
- Verify: `eslint.config.mjs` (already includes `eslint-config-prettier` in recent Nest scaffolds)

- [ ] **Step 1: Write an explicit Prettier config**

Create `.prettierrc`:
```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "semi": true
}
```

- [ ] **Step 2: Ensure package.json has clear lint/format scripts**

In `package.json` `"scripts"`, confirm/replace these entries:
```json
"lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
"format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
"format:check": "prettier --check \"src/**/*.ts\" \"test/**/*.ts\""
```

- [ ] **Step 3: Format the whole codebase to the new config**

Run:
```powershell
pnpm run format
```
Expected: lists the files it reformatted; exits 0.

- [ ] **Step 4: Verify lint passes clean**

Run:
```powershell
pnpm run lint; pnpm run format:check
```
Expected: both exit 0, no errors.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "chore: configure ESLint + Prettier with project rules"
```

---

### Task 3: Add validated environment config

**Files:**
- Create: `.env.example`
- Create: `.env` (local, gitignored — verify it's ignored)
- Create: `src/config/env.validation.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Create `.env.example` (committed) and `.env` (local)**

Create `.env.example`:
```
# Server
PORT=3000

# MongoDB Atlas — get the SRV string from Atlas > Connect > Drivers
MONGO_URI=

# Auth (added in Part 2)
JWT_SECRET=

# Gemini (added in Part 5)
GEMINI_API_KEY=
```

Then copy it to a real local `.env` and fill `MONGO_URI` + `PORT=3000`:
```powershell
Copy-Item .env.example .env
```
Confirm `.env` is gitignored:
```powershell
git check-ignore .env
```
Expected: prints `.env` (meaning it IS ignored). If it prints nothing, add a line `.env` to `.gitignore`.

- [ ] **Step 2: Add env validation schema**

Install the validation deps:
```powershell
pnpm add @nestjs/config joi
```

Create `src/config/env.validation.ts`:
```ts
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  MONGO_URI: Joi.string().uri({ scheme: ['mongodb', 'mongodb+srv'] }).required(),
  JWT_SECRET: Joi.string().optional(),       // required in Part 2
  GEMINI_API_KEY: Joi.string().optional(),   // required in Part 5
});
```

- [ ] **Step 3: Wire ConfigModule into AppModule**

Edit `src/app.module.ts` so `ConfigModule` is global and validates env on boot:
```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 4: Verify boot fails loudly on a bad env, then passes with a good one**

Temporarily blank `MONGO_URI` in `.env`, run `pnpm run start`, expect a startup error naming `MONGO_URI`. Restore the real value, run again, expect a clean start. Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: add validated environment configuration"
```

---

### Task 4: Connect to MongoDB Atlas

**Files:**
- Modify: `src/app.module.ts`

- [ ] **Step 1: Install Mongoose integration**

Run:
```powershell
pnpm add @nestjs/mongoose mongoose
```

- [ ] **Step 2: Add the async Mongoose connection (reads MONGO_URI from config)**

Edit `src/app.module.ts` imports to add `MongooseModule`:
```ts
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

// inside imports: [] after ConfigModule.forRoot({...}):
MongooseModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    uri: config.getOrThrow<string>('MONGO_URI'),
  }),
}),
```

- [ ] **Step 3: Verify the DB connects on boot**

Run:
```powershell
pnpm run start
```
Expected: logs include Mongoose connecting with no connection error; app reaches `Nest application successfully started`. (If Atlas rejects the IP, add your IP under Atlas > Network Access.) Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: connect to MongoDB Atlas via Mongoose"
```

---

### Task 5: Global API prefix, validation pipe, CORS, and a health endpoint

**Files:**
- Modify: `src/main.ts`
- Create: `src/health/health.controller.ts`
- Create: `src/health/health.module.ts`
- Modify: `src/app.module.ts`
- Delete: `src/app.controller.ts`, `src/app.controller.spec.ts`, `src/app.service.ts` (replaced by health)

- [ ] **Step 1: Configure main.ts (prefix, validation, CORS, port from config)**

Replace `src/main.ts` with:
```ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: true, credentials: true });
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}
bootstrap();
```

- [ ] **Step 2: Create the health module + controller**

Create `src/health/health.controller.ts`:
```ts
import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  check() {
    // mongoose readyState: 1 = connected
    return {
      status: 'ok',
      db: this.connection.readyState === 1 ? 'connected' : 'disconnected',
    };
  }
}
```

Create `src/health/health.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({ controllers: [HealthController] })
export class HealthModule {}
```

- [ ] **Step 3: Register HealthModule, remove the default app controller/service**

Edit `src/app.module.ts`: add `HealthModule` to `imports`, remove `AppController`/`AppService` from `controllers`/`providers` and their imports. Then delete the files:
```powershell
Remove-Item src/app.controller.ts, src/app.controller.spec.ts, src/app.service.ts
```

- [ ] **Step 4: Verify the health endpoint end to end**

Start the app (`pnpm run start`), then in a second terminal:
```powershell
Invoke-RestMethod http://localhost:3000/api/health
```
Expected: `status : ok` and `db : connected`. Stop the app with Ctrl+C.

- [ ] **Step 5: Lint, format, commit**

```powershell
pnpm run lint; pnpm run format
git add -A
git commit -m "feat: add global API prefix, validation, CORS, and health endpoint"
```

---

### Task 6: Add the shared CLAUDE.md context file

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write a short CLAUDE.md (the pitch, stack, models, contract)**

Create `CLAUDE.md`:
```markdown
# Penny — Invoice Copilot (Backend)

AI copilot for non-technical SMB owners: upload an invoice → Gemini vision extracts it →
live dashboard of what's owed → a chat copilot controls the app via tools.

## Stack
- NestJS + TypeScript, pnpm
- MongoDB Atlas via @nestjs/mongoose
- Gemini 2.5 Flash (@google/generative-ai) — vision + function calling
- LangGraph.js agent (ChatModule) with tools: query_invoices, get_summary, mark_paid
- JWT auth (email/password)

## Conventions
- Global prefix `/api`, global ValidationPipe, DTOs + class-validator on every endpoint.
- Modular: auth / users / invoices / chat / gemini.
- Files are extract-and-discard (sourceFile = filename string only).

## Data models
User        { _id, name, email, passwordHash, company, createdAt }
Invoice     { _id, userId, vendor, email, amount, currency, category,
              dueDate, issuedDate, status:'open'|'paid', sourceFile, createdAt }
ChatMessage { _id, userId, sessionId, role, content, toolName?, createdAt }

Full design: docs/superpowers/specs/2026-06-07-penny-invoice-copilot-design.md
```

- [ ] **Step 2: Commit**

```powershell
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md backend context"
```

---

## Definition of done (Part 1)

- `pnpm run start` boots with no errors and connects to MongoDB Atlas.
- `GET http://localhost:3000/api/health` returns `{ status: 'ok', db: 'connected' }`.
- `pnpm run lint` and `pnpm run format:check` pass clean.
- `.env` is gitignored; `.env.example` is committed.
- Repo history has clear, small commits per task.

**Next part (separate plan):** Part 2 — Auth (signup/login/me with JWT guard), written test-first.
