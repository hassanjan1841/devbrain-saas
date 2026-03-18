# DevBrain SaaS

**AI that learns YOUR coding style and improves every project**

DevBrain is a production-ready TypeScript monorepo with:
- **Next.js 14 frontend** (`apps/web`)
- **Express API** (`apps/api`)
- **Prisma + PostgreSQL + Chroma** data layer (`packages/db`)
- **AI memory + embeddings core** (`packages/brain-core`)
- **CLI** (`packages/cli`)

## Architecture

```text
apps/
  web/          Next.js dashboard
  api/          Express API
packages/
  db/           Prisma schema, database client, Chroma helpers
  brain-core/   Embeddings, memory indexing, search, reflections
  cli/          Node CLI client
```

## Features

- JWT authentication with bcrypt password hashing
- Workspace-scoped `Workspace`, `Session`, and `Memory` records in PostgreSQL
- Ollama local embeddings via `nomic-embed-text`
- Chroma vector storage and similarity search
- Workspace ask flow backed by memories plus optional ingested code chunks
- CLI repo linking through `.devbrain.json`
- Minimal frontend for auth, workspace list/detail, ask, and memory browsing

## Prerequisites

- **Node.js 20+**
- **npm 10+**
- **PostgreSQL**
- **Ollama** with `nomic-embed-text`
- **Chroma DB** running locally or remotely

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Copy environment files

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp packages/cli/.env.example packages/cli/.env
cp packages/db/.env.example packages/db/.env
cp packages/brain-core/.env.example packages/brain-core/.env
```

### 3. Start local services

PostgreSQL example:

```bash
docker run --name devbrain-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=devbrain -p 5432:5432 -d postgres:16
```

Chroma example:

```bash
docker run --name devbrain-chroma -p 8000:8000 -d chromadb/chroma
```

Ollama example:

```bash
ollama serve
ollama pull nomic-embed-text
ollama pull llama3.2
```

### 4. Prepare database

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

If Prisma does not pick up your root `.env` while running workspace scripts, pass `DATABASE_URL` explicitly:

```bash
DATABASE_URL="postgresql://..." npm run db:migrate
```

### 5. Run the app

```bash
npm run dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

## Default seeded user

```text
email: demo@devbrain.ai
password: password123
```

## API routes

### Public
- `GET /health`
- `POST /signup`
- `POST /login`

### Authenticated
- `POST /workspaces`
- `GET /workspaces`
- `GET /workspaces/:id`
- `POST /memories`
- `GET /memories?workspaceId=...`
- `POST /ask`
- `POST /ingest`

All responses are JSON with a stable shape:

```json
{
  "success": true,
  "data": {}
}
```

Errors:

```json
{
  "success": false,
  "error": {
    "message": "Something went wrong"
  }
}
```

## CLI usage

There are **two ways** to use the DevBrain CLI.

### Option A – Monorepo-local (no global install)

Login and persist a token:

```bash
npm run cli -- login --email demo@devbrain.ai --password password123
```

Link the current repo to a workspace:

```bash
npm run cli -- init
```

Store a memory:

```bash
npm run cli -- remember "Implemented VAT for EU orders in CheckoutService with edge cases X and Y."
```

Ask a workspace question:

```bash
npm run cli -- ask "Where do I calculate VAT for EU orders and what edge cases did I handle?"
```

Optional code/docs ingestion:

```bash
npm run cli -- ingest --code . --notes ./docs
```

### Option B – Global `devbrain` command

If you prefer a clean global command like `devbrain login` instead of `npm run cli -- login`, you can link the CLI globally from this repo:

```bash
# From the repo root
npm run build --workspace @devbrain/cli
npm link --workspace @devbrain/cli
```

After that, you can use:

```bash
devbrain login --email demo@devbrain.ai --password password123
devbrain init
devbrain remember "Implemented VAT for EU orders in CheckoutService with edge cases X and Y."
devbrain ask "Where do I calculate VAT for EU orders and what edge cases did I handle?"
# Optional
devbrain ingest --code . --notes ./docs
```

Use **Option A** in CI/monorepo scripts, and **Option B** on your local machine for a nicer DX.

## Deployment notes

### Web
- Build with `npm run build --workspace @devbrain/web`
- Deploy to Vercel, Docker, or any Node-compatible platform
- Set `NEXT_PUBLIC_API_URL`

### API
- Build with `npm run build --workspace @devbrain/api`
- Run `node dist/index.js`
- Set database, JWT, Ollama, and Chroma environment variables

### Database package
- Run Prisma migrations in CI/CD before starting the API
- Ensure Chroma collection access is reachable from the API environment
- Migration files live under `packages/db/prisma/migrations`

## Production hardening suggestions

- Rotate `JWT_SECRET`
- Use HTTPS everywhere
- Add rate limiting and refresh-token rotation
- Replace mock session output generation with your LLM/task engine
- Add structured logging, tracing, and background jobs if needed

## Monorepo commands

```bash
npm run dev
npm run dev:web
npm run dev:api
npm run build
npm run db:generate
npm run db:migrate
npm run db:seed
npm run cli -- init
npm run cli -- remember "your memory"
npm run cli -- ask "your question"
```

## Using DevBrain with AI coding agents (Codex, Claude Code, Amp, etc.)

DevBrain is designed to work as a **shared memory backend** for any AI coding agent or CLI tool.

### Pattern 1 – After agent run: auto-remember

When an agent finishes a task in a repo, save a memory automatically.

Example script (run in CI or after a successful run):

```bash
# Summarize what changed (pseudocode – replace with your own summary logic)
SUMMARY="Refactored checkout VAT logic in src/checkout.ts. Handled EU digital goods + B2B invoices."

# Store in the current workspace
devbrain remember "$SUMMARY"
```

You can call this from:
- Codex / Claude Code / Amp run scripts
- GitHub Actions workflows
- Local scripts you use to wrap agent runs

### Pattern 2 – Before agent run: ask DevBrain for context

Before starting an agent on a repo, fetch relevant context and inject it into the prompt:

```bash
CONTEXT=$(devbrain ask "What should I know before changing the billing/checkout logic?")

# Then pass $CONTEXT into your agent's system / preamble prompt.
```

For example, a wrapper script might:

1. Call `devbrain ask "What are the known edge cases in auth?"`
2. Prepend that answer to the Codex or Claude Code prompt
3. Let the agent work with that context.

### Pattern 3 – Per-repo workspace linking

In each repo:

```bash
# One-time setup
devbrain login --email you@example.com --password ...
devbrain init  # choose or create a workspace for this repo

# From now on, remember/ask in this repo are tied to that workspace
devbrain remember "Implemented feature X with tradeoffs A/B."
devbrain ask "Where did I implement feature X and what did I decide about A/B?"
```

Hook these into your agent workflows so every automated change can write to / read from the same workspace.
