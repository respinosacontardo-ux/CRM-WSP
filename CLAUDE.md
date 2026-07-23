# Project conventions (MKT BATTISTON CRM)

Single-tenant CRM with ONE embedded WhatsApp AI agent that captures leads and
books demos/sales meetings. One deployment = one company.

## Golden rules

- **Package manager: pnpm ALWAYS. Never use npm or npx.**
  - Install: `pnpm install`
  - Run a script in a package: `pnpm --filter ./backend <script>`
  - Execute a binary: `pnpm exec <bin>` (never `npx`).
- **Language split:** code, identifiers and code comments in **English**;
  all UI copy and the README in **Spanish**.
- **Domain logic lives in NestJS services.** Mastra tools are thin wrappers
  that call those services — never put business logic in a tool.
- **Mastra is imported LAST in `backend/src/app.module.ts`.** Mastra mounts
  catch-all routes under `/api`, so its module must come after every other
  module or it will shadow their routes.

## Architecture

- Frontend: Next.js (App Router) + React + Tailwind. Runs on `:3000`.
- Backend: NestJS + TypeORM with the Mastra agent embedded in the same process.
  Global prefix `/api`. Runs on `:3001`.
- Database: PostgreSQL. Docker Compose runs ONLY the database locally
  (host port **5433**).
- Realtime: Server-Sent Events. A single endpoint `GET /api/events` +
  the browser's native `EventSource`.
- Mastra storage (`@mastra/pg`) uses the SAME Postgres database as TypeORM.

## What is configured where

- **From the UI (Agent screen):** company persona, meeting types, business
  hours, and the AI model (OpenRouter API key + model choice).
- **From code/env only (`backend/.env`):** the WhatsApp/YCloud connection
  (`YCLOUD_API_KEY`, `YCLOUD_WEBHOOK_SECRET`, `YCLOUD_WHATSAPP_NUMBER`).
  There is NO UI screen for YCloud.

## Security invariants

- No login: this is a single-tenant admin tool. Do not expose it to the public
  internet without putting authentication in front. The ONLY public endpoint is
  the signed webhook.
- Secrets never leave the API: the config endpoint returns `has*` booleans, not
  secret values. Updates ignore empty secret fields so they are never overwritten.
- Webhook is fail-closed: with no webhook secret configured, reject with `401`.
- Never log PII or secrets. Lead contact data is personal/sensitive.

## Agent scope (commercial safeguard)

The agent ONLY qualifies leads and books demos. It must NOT invent prices or
features that are not in the configured info, must NOT promise guaranteed
results, and must NOT provide technical support. For pricing/closing/complex
questions it offers to book a demo or a meeting with the team.
