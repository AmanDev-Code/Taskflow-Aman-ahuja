# TaskFlow



note: pushed env variables deliberately as it is not important all are for docker and only gemini key is there i have rotated it so you can add your key on both backend and on root env  
  
this is not just taskflow(kanban this is production ready user onboarding and many other thing feel free to reach me out @ [amanahuja0657@gmail.com](mailto:amanahuja0657@gmail.com) or contact number: 8102223631, Name: Aman Ahuja, Linkedin: [https://linkedin.com/in/itsamanahuja](https://linkedin.com/in/itsamanahuja)



Full-stack task management: authentication, projects, tasks, and a Kanban-style UI. Built for the **TaskFlow engineering take-home** (`maintask.md`); this README maps the deliverable to that rubric.

## 1. Overview

TaskFlow lets users register and log in (JWT), create projects, manage tasks (create, update, filter, assign), and collaborate. The baseline spec from `maintask.md` is satisfied; the schema and API are **extended** with optional product features (members, tags, subtasks, attachments, activity, time tracking, AI helpers, SSE) without removing required concepts.

### Tech stack (language choice)

The assignment prefers **Go** for the backend; **NestJS (Node.js + TypeScript)** is used here instead, with Fastify, PostgreSQL, raw SQL via `pg`, **dbmate** migrations, bcrypt (cost **≥ 12**), and JWT (**24h**, claims include user id and email).

**Frontend:** React 18, TypeScript, Vite, React Router, TanStack Query, Zustand, Tailwind CSS, **shadcn/ui** (Radix primitives), **dnd-kit** for drag-and-drop on the board.

**Infrastructure:** Root `docker-compose.yml` runs **PostgreSQL**, **MinIO** (attachments), the **API** (multi-stage Dockerfile), and the **React app** (multi-stage build + Nginx). Credentials and secrets come from `**.env`** (see `.env.example`). **JWT secret is never hardcoded** in source; it must be set in the environment.

### Alignment with `maintask.md` (quick checklist)


| Requirement                                                                         | Status                                                                      |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| PostgreSQL + migration tool (dbmate)                                                | Yes; **up and down** sections in each migration under `backend/migrations/` |
| Migrations on container start                                                       | Yes; backend entrypoint runs `dbmate up` then idempotent `seed.sql`         |
| Seed: ≥1 user (known password), ≥1 project, ≥3 tasks (different statuses)           | Yes; `backend/migrations/seed.sql`                                          |
| Auth: register/login, bcrypt, JWT, protected routes                                 | Yes                                                                         |
| Projects & tasks API per spec (list/create/get/patch/delete, filters)               | Yes; responses wrapped as `{ data, message }` (see API below)               |
| JSON errors; 401 vs 403; structured validation where applicable                     | Yes (global exception filter)                                               |
| Structured logging & graceful shutdown (SIGTERM/SIGINT)                             | Yes (`main.ts`, Nest/Fastify logger)                                        |
| React Router, auth persistence, protected routes, loading/error states              | Yes                                                                         |
| Optimistic UI for task status changes                                               | Yes (React Query + Kanban moves)                                            |
| Responsive UI; component library named                                              | shadcn/ui                                                                   |
| `docker compose up` from clean clone + `.env`                                       | Yes (see below)                                                             |
| **Bonus (optional):** pagination, `/projects/:id/stats`, DnD, dark mode, SSE, tests | Pagination & stats & DnD & dark mode & SSE & controller tests implemented   |


**Extensions beyond the PDF:** extra task statuses and `urgent` priority, multi-assignee, subtasks, project members, tags, attachments (MinIO), comments/activity feeds, duplicate task, timers, optional Gemini-powered AI (requires API key in `.env`).

## 2. Architecture decisions

- **Domains in Nest modules** — `auth`, `users`, `projects`, `tasks`, `members`, `tags`, `attachments`, `activities`, `events` (SSE), `ai`, plus shared `common` and `database`.
- **Raw SQL** — Full control over queries and indexes; no ORM auto-migrate.
- **Fastify** — Used under Nest for performance; multipart uploads for attachments.
- **Global `JwtAuthGuard` + `@Public()`** — Default-deny with explicit public routes (auth, attachment preview/download tokens, SSE entry with token query).
- **Response envelope** — `ResponseInterceptor` wraps successful payloads as `{ data, message: "success" }` for consistency with the React `api` client.
- **Frontend** — Server state in React Query (cache + optimistic updates); auth in Zustand + `localStorage`; feature-oriented components under `components/`.

**Tradeoffs:** Single access JWT (no refresh token). Real-time is **SSE** (not WebSockets), scoped per project. Attachment and AI features add operational surface (MinIO, optional provider keys).

## 3. Running locally

Assume **Docker** only (no local Node/Postgres required for the full stack).

```bash
git clone https://github.com/your-name/taskflow.git
cd taskflow

# Root env (Postgres, JWT, MinIO, VITE_API_URL for the frontend image build)
cp .env.example .env

# Backend env file (Compose mounts this; Nest also reads it for local keys)
cp backend/.env.example backend/.env

# Frontend (optional for `npm run dev`; Docker build uses root VITE_API_URL)
cp frontend/.env.example frontend/.env

# Edit copies if needed — example files use matching dev values

docker compose up --build
```

Wait until **db** and **minio** are **healthy** (about 30–60 seconds on first pull). Then:

- **App (UI):** [http://localhost:3000](http://localhost:3000)  
- **API:** [http://localhost:3001](http://localhost:3001)  
- **MinIO console (optional):** [http://localhost:9003](http://localhost:9003) (API S3 port **9002** mapped from container 9000)

**Ports:** `3000` frontend, `3001` API, `5432` Postgres, `9002`/`9003` MinIO. Ensure nothing else binds to them.

### Development without the full stack (optional)

```bash
docker compose up db minio
cd backend && cp ../.env.example .env   # adjust DATABASE_URL to localhost
npm install && npm run start:dev

cd frontend && cp .env.example .env && npm install && npm run dev
```

`frontend/.env` sets `VITE_API_URL=http://localhost:3001` by default so the dev server talks to the local API.

## 4. Running migrations

- **Docker (default):** Migrations run automatically when the **backend** container starts (`dbmate up`), then `**psql` applies `migrations/seed.sql`** (idempotent `ON CONFLICT` / `DO NOTHING` where appropriate). If seed fails, the container exits so the problem is visible in logs.
- **Manual (dbmate on host),** from `backend/`:

```bash
export DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
dbmate --migrations-dir ./migrations up
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ./migrations/seed.sql
```

- **Re-seed / fresh DB:** `docker compose down -v` then `docker compose up --build` (destroys Postgres volume).

## 5. Test credentials

Seeded automatically with Docker (see `backend/migrations/seed.sql`):


| Field        | Value              |
| ------------ | ------------------ |
| **Email**    | `test@example.com` |
| **Password** | `password123`      |


Additional users (same password) exist for member flows, e.g. `alex@example.com`, `sam@example.com`.

## 6. API reference

All authenticated routes expect:

`Authorization: Bearer <access_token>`

unless noted. Successful JSON bodies are shaped as:

```json
{ "data": { ... }, "message": "success" }
```

### Core (`maintask.md`)


| Method | Path                  | Description                              |
| ------ | --------------------- | ---------------------------------------- |
| POST   | `/auth/register`      | Register                                 |
| POST   | `/auth/login`         | JWT + user                               |
| GET    | `/projects`           | List (optional `?page=&limit=`)          |
| POST   | `/projects`           | Create                                   |
| GET    | `/projects/:id`       | Project + tasks                          |
| PATCH  | `/projects/:id`       | Update (owner)                           |
| DELETE | `/projects/:id`       | Delete (owner)                           |
| GET    | `/projects/:id/tasks` | List (`?status=&assignee=&page=&limit=`) |
| POST   | `/projects/:id/tasks` | Create task                              |
| PATCH  | `/tasks/:id`          | Update task                              |
| DELETE | `/tasks/:id`          | Delete task                              |


### Bonus / spec-adjacent


| Method | Path                  | Description                 |
| ------ | --------------------- | --------------------------- |
| GET    | `/projects/:id/stats` | Counts by status & assignee |


### Extended API (high level)

- **Users:** `GET /users/me`, `PATCH /users/me`, `POST /users/me/change-password`, `GET /users/search?query=&limit=`
- **Members:** `GET|POST /projects/:id/members`, `DELETE /projects/:id/members/:userId`
- **Tags:** `GET|POST /projects/:id/tags`, task tag updates via task PATCH/body as implemented in UI
- **Subtasks:** `GET|POST /tasks/:taskId/subtasks`, `PATCH|DELETE` subtask routes on `tasks` controller
- **Attachments:** `GET|POST /tasks/:taskId/attachments`, subtask variants under `/subtasks/:id/attachments`, signed preview/download URLs
- **Activity / comments:** `GET|POST /tasks/:taskId/activities`, `.../activities/comments`, subtask equivalents
- **Timers:** `POST /tasks/:taskId/time/start|stop`, `GET .../time/status`, `POST .../time/add` (and subtask mirrors)
- **Realtime:** `GET /events/projects/:projectId` (SSE; token may be passed as query for EventSource)
- **AI:** task-scoped endpoints under `/ai/...` (optional; requires `GEMINI_API_KEY` or `GOOGLE_API_KEY` in env)

**Errors:** Validation often returns `400` with `{ "error": "validation failed", "fields": { ... } }` (or equivalent). **401** unauthenticated, **403** forbidden, **404** not found — see `HttpExceptionFilter` for exact shapes.

**Integration tests:** Controller specs under `backend/src/auth`, `projects`, `tasks` (`*.spec.ts`).

## 7. What you’d do with more time

- **Hardening:** Refresh tokens, rate limiting, stricter CORS defaults in production, security headers on the API.
- **Quality:** Broaden integration/e2e coverage (Playwright), contract tests for the extended API.
- **Product:** Email invites, notifications, richer permissions, full-text search across entities.
- **Ops:** Health/readiness endpoints, metrics, tracing, managed object storage instead of self-hosted MinIO for production.

---

## Project structure (abbreviated)

```
taskflow/
├── backend/                 # NestJS API
│   ├── src/                 # auth, users, projects, tasks, members, tags,
│   │                        # attachments, activities, events, ai, common, database
│   ├── migrations/          # dbmate SQL (+ seed.sql)
│   └── Dockerfile           # multi-stage: build → node + dbmate + psql
├── frontend/                # React + Vite
│   ├── src/
│   └── Dockerfile           # multi-stage: node build → nginx
├── docker-compose.yml
├── .env.example
├── maintask.md              # assignment rubric (source of truth for requirements)
└── README.md
```

## License

MIT