# DevBrain v1 – Implementation Plan (DevBrain Memory)

Goal: **Second brain for your codebases.** For solo/freelance devs who switch between projects and forget how/why things were built.

Core loop: **Create workspace → link repo via CLI → add memories → ask questions later.**

---

## 1. Data Model Changes (Prisma – `packages/db`)

1. Add `Workspace` model:
   - Fields:
     - `id` (cuid, primary key)
     - `userId` (FK → `User`)
     - `name` (string)
     - `slug` (string, unique)
     - `description` (string, optional)
     - `createdAt` (DateTime, default now)
     - `updatedAt` (DateTime, updatedAt)
   - Relations:
     - `user` (to `User`)
     - `memories` (list of `Memory`)
     - `sessions` (list of `Session`)

2. Update `Memory` model:
   - Add `workspaceId` (FK → `Workspace`)
   - Add relation `workspace`.
   - Add optional metadata fields:
     - `tags` (string list, default empty)
     - `repoPath` (string, optional)
     - `commitHash` (string, optional; can be filled later).

3. Update `Session` model:
   - Add `workspaceId` (FK → `Workspace`)
   - Add relation `workspace`.

4. After schema changes, run in project root:
   - `npm run db:generate`
   - `npm run db:migrate`

---

## 2. API Endpoints (Express – `apps/api`)

Use existing auth (JWT) middleware. All endpoints require authentication unless noted.

1. Workspaces
   - `POST /workspaces`
     - Body: `{ name, description? }`
     - Creates a workspace for the current user.
     - Generates a unique slug from the name.
     - Returns workspace data.
   - `GET /workspaces`
     - Returns list of workspaces for current user.
   - `GET /workspaces/:id`
     - Returns a single workspace (ensure it belongs to current user).

2. Memories
   - `POST /memories`
     - Body: `{ workspaceId, content, tags?, repoPath? }`
     - Creates a memory associated with the workspace and user.
   - `GET /memories`
     - Query: `workspaceId` (required)
     - Returns list of memories for that workspace ordered by `createdAt` desc.

3. Ask endpoint
   - `POST /ask`
     - Body: `{ workspaceId, query }`
     - Validates that workspace belongs to current user.
     - Calls a function in `brain-core` to:
       - Look up relevant memories and code chunks for that workspace.
       - Synthesize an answer.
     - Returns structured response like:
       - `{ answer, memories: [...], codeChunks: [...] }`.

4. Optional ingestion endpoint (for CLI `ingest` command)
   - `POST /ingest`
     - Body: `{ workspaceId, files: [...] }` or similar.
     - Passes data to `brain-core` ingestion.

---

## 3. Brain Core Hooks (`packages/brain-core`)

Implement functions that the API will call. Keep them simple for v1.

1. Ask function
   - Input: `workspaceId`, `query`.
   - Steps (high level):
     - Use Chroma (or existing vector DB) to search within:
       - Memories for that workspace.
       - Optional code/document chunks linked to the workspace.
     - Take top-k results.
     - Use your LLM / template to generate a short answer based on those results.
   - Output: answer text + references (which memories / chunks were used).

2. Ingest function (optional v1)
   - Input: `workspaceId`, list of file contents and paths.
   - Steps:
     - Chunk files.
     - Embed chunks.
     - Store in vector DB under a namespace keyed by `workspaceId`.

Focus on correctness and clarity, not perfection. You can refine ranking later.

---

## 4. CLI Commands (`packages/cli`)

Goal: Make it natural to use DevBrain from inside a repo.

### 4.1 Config file

- In each project repo, store `.devbrain.json` with:
  - `workspaceId`
  - `projectName`
  - `repoPath`

### 4.2 Commands

1. `devbrain login`
   - Already exists: make sure it stores auth token for CLI requests.

2. `devbrain init`
   - Flow:
     - Check login.
     - Fetch `GET /workspaces`.
     - Show a list, allow selecting existing or creating new via `POST /workspaces`.
     - Write `.devbrain.json` in current directory with selected `workspaceId`.

3. `devbrain remember "..."`
   - Flow:
     - Read `.devbrain.json` from current directory.
     - If missing, prompt user to run `devbrain init` first.
     - Send `POST /memories` with:
       - `workspaceId` from config.
       - `content` from CLI argument.
       - Optional: current working directory as `repoPath`.

4. `devbrain ask "..."`
   - Flow:
     - Read `.devbrain.json`.
     - Send `POST /ask` with `workspaceId` and `query`.
     - Print answer and list of referenced memories.

5. Optional: `devbrain ingest --code . --notes ./docs`
   - Flow:
     - Read `.devbrain.json`.
     - Walk code and docs directories.
     - Build a list of files and contents (with size limits).
     - Send to `POST /ingest` with `workspaceId`.

Keep CLI output clean and text-based (easy to read in terminal).

---

## 5. Web App Changes (Next.js – `apps/web`)

### 5.1 Workspaces list page

- Route: `/workspaces`.
- Shows:
  - List of workspaces (name, description, last updated).
  - Button: "New workspace".
- Creating a workspace:
  - Simple form (name, optional description).
  - Calls `POST /workspaces`.

### 5.2 Workspace detail page

- Route: `/workspaces/[id]`.
- Shows:
  - Workspace name and description.
  - Search input: placeholder like "Ask DevBrain about this project".
  - On submit:
    - Calls `POST /ask` with `workspaceId` and query.
    - Displays answer text.
  - Below search:
    - List of recent memories from `GET /memories?workspaceId=...`.

For v1, keep UI minimal but functional: text fields, lists, basic styling.

---

## 6. v1 Demo Flow (End-to-End)

1. Start app locally in `devbrain-saas` root:
   - `npm install`
   - `npm run db:generate`
   - `npm run db:migrate`
   - `npm run db:seed`
   - `npm run dev`
   - Web: `http://localhost:3000`
   - API: `http://localhost:4000`

2. In the web app:
   - Sign up or log in.
   - Go to `/workspaces`.
   - Create a workspace, e.g. "Travel SaaS".

3. In a project repo (e.g. `~/projects/travel-saas`):
   - `devbrain login`
   - `devbrain init` → link repo to "Travel SaaS" workspace.
   - After implementing something:
     - `devbrain remember "Implemented VAT for EU orders in CheckoutService with edge cases X and Y."`

4. Later, when you return to the project:
   - `devbrain ask "Where do I calculate VAT for EU orders and what edge cases did I handle?"`
   - You expect:
     - A clear answer referring to the memory you wrote.
     - Optional: file paths or extra context.

5. In the web app, open the same workspace:
   - See the list of memories.
   - Use the search/ask bar to query the same thing and view the answer.

---

## 7. What to Delay (Not v1)

Do not add these yet (to keep scope focused):

- Multi-user workspaces or team sharing.
- Complex permissions/roles.
- Automatic background file watching.
- Deep PR/diff-aware code reviews.
- Fancy visualizations or analytics.

Ship v1 when:

- You can create a workspace.
- You can link a repo via CLI.
- You can add memories from the CLI.
- You can ask a question and reliably get a useful answer using those memories (plus optional code context).

That’s enough to demo and get feedback.
