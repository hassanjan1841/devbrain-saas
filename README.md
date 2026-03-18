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
