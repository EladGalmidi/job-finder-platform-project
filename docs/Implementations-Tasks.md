# Broken-Down Execution Plan — Smart Job Platform

**How to read this document:**
- Every task has an **ID** (for example `B-03`) — so you can open a GitHub Issue from it.
- Every task has a **DoD** (Definition of Done) — when you're allowed to mark it ✅.
- **Time estimate** = net working hours for one developer.
- At the end of the document there is a **sprint board** that orders all the tasks by execution order and dependencies.

**Iron rule:** no task is closed without (1) code in a branch, (2) a manual check that it works, (3) a merged PR.

---

# Part A — Frontend (React + TypeScript)

**What we're building:** a website that lets you register, upload a resume, search for jobs, and see a match score + recommendations.

## F-01 — Project setup
- `npm create vite@latest frontend -- --template react-ts`
- Install Tailwind + configure `tailwind.config.js`
- Install ESLint + Prettier
- Folder structure: `src/pages`, `src/components`, `src/api`, `src/hooks`, `src/types`, `src/store`
- **DoD:** `npm run dev` starts and shows a blank page with Tailwind styling. ⏱ 2h

## F-02 — Routing and navigation skeleton
- Install `react-router-dom`
- Define all routes: `/`, `/login`, `/register`, `/dashboard`, `/jobs`, `/jobs/:id`, `/resume`, `/matches`, `/recommendations`
- Create a `Layout` (Navbar + content + Footer)
- **DoD:** navigating between all routes works, each page shows its own name. ⏱ 3h

## F-03 — Base component library
Build each one as a standalone component with props typed in TypeScript:
- `Button`, `Input`, `Card`, `Modal`, `Spinner`, `EmptyState`, `ErrorMessage`
- **DoD:** there is a `/playground` page that displays all of them. ⏱ 4h

## F-04 — Domain components
- `Navbar` — logo, links, user avatar, logout button
- `JobCard` — title, company, location, skill tags, match score
- `SearchBar` — search field + button
- `Filters` — location, job type, experience level, match score range
- `SkillBadge` — a tag colored by state (have / missing / recommended)
- `MatchScoreCard` — percentage circle + breakdown
- `ResumeUpload` — Drag & Drop + file picker + display of the file name
- **DoD:** every component is displayed in the playground with mock data. ⏱ 8h

## F-05 — API Client
- Create `src/api/client.ts` with Axios and a `baseURL` from `.env`
- An interceptor that adds `Authorization: Bearer <token>` to every request
- An interceptor that catches 401 → clears the token → redirects to login
- TypeScript types for every server response in `src/types/api.ts`
- **DoD:** a call to the backend's `/health` returns a response. ⏱ 3h

## F-06 — State management
- Install TanStack Query + configure `QueryClientProvider`
- `AuthContext` — user, token, login(), logout()
- Store the token in `localStorage` + reload it on page refresh
- `ProtectedRoute` — blocks pages for anyone not logged in
- **DoD:** refreshing the page doesn't log the user out; a protected page redirects to login. ⏱ 4h

## F-07 — Auth screens
- `Login` — email, password, validation, error message
- `Register` — name, email, password, password confirmation
- After success → store the token → move to the dashboard
- **DoD:** real registration and login against the backend work. ⏱ 5h

## F-08 — Dashboard screen
- Summary cards: number of matched jobs, CV status, average match score
- List of the 5 best matches
- A shortcut to upload a CV if there isn't one
- **DoD:** the data is loaded from the API and not hardcoded. ⏱ 5h

## F-09 — Jobs screens
- `JobsSearch` — SearchBar + Filters + a list of `JobCard` + Pagination
- Store filters in URL query params (so a link can be shared)
- `JobDetails` — full description, requirements, skills, match score, apply button
- **DoD:** search, filtering and paging work against a real API. ⏱ 8h

## F-10 — CV upload screen
- File selection + client-side validation (PDF only, up to 5MB)
- Show a progress bar during upload
- Poll `/resume/status` until processing finishes
- Display the skills extracted from the CV
- **DoD:** uploading a real PDF ends with a list of skills being displayed. ⏱ 6h

## F-11 — Matches and recommendations screens
- `MatchingResults` — a table/list of jobs with scores, sorted by score
- Display "missing skills" for each job
- `Recommendations` — a list of skills recommended for learning + an explanation of why
- **DoD:** both screens display real data from the backend. ⏱ 6h

## F-12 — Error handling and Loading
- Skeleton loaders for every list
- Toasts for success/error messages
- A global `ErrorBoundary`
- A 404 screen
- **DoD:** shutting down the backend → the site shows friendly errors and doesn't break. ⏱ 4h

## F-13 — Responsiveness and accessibility
- Test at 3 widths: mobile, tablet, desktop
- Keyboard navigation + `aria-label` for icon buttons
- **DoD:** all screens are usable on mobile. ⏱ 4h

---

# Part B — Backend (FastAPI + Python)

**What we're building:** the API that holds all the logic, talks to the DB and feeds the AI Worker.

## B-01 — Project setup
- `venv` + `requirements.txt` (fastapi, uvicorn, sqlalchemy, alembic, psycopg2-binary, pydantic-settings, python-jose, passlib[bcrypt], python-multipart)
- Folder structure:
```
backend/
├── app/
│   ├── routers/       # HTTP layer only
│   ├── services/      # business logic
│   ├── repositories/  # DB access
│   ├── models/        # SQLAlchemy
│   ├── schemas/       # Pydantic
│   ├── core/          # config, security, deps
│   └── main.py
└── tests/
```
- **DoD:** `uvicorn app.main:app` runs and `/docs` opens. ⏱ 3h

## B-02 — Config and Health
- `Settings` using pydantic-settings that reads from `.env` (DB_URL, JWT_SECRET, REDIS_URL, RABBITMQ_URL)
- `GET /health` that returns status + DB connectivity
- Configure CORS for the frontend origin
- **DoD:** `/health` returns 200; the frontend can call it without a CORS error. ⏱ 2h

## B-03 — Security utilities
- `hash_password` / `verify_password` with bcrypt
- `create_access_token` / `decode_token` with JWT (60-minute expiry)
- A `get_current_user` dependency that decodes the token and returns a user
- **DoD:** unit tests pass for hashing + encode/decode. ⏱ 3h

## B-04 — Auth API
- `POST /auth/register` — validate that the email doesn't already exist, hash the password, create the user
- `POST /auth/login` — authenticate + return a token
- `GET /users/me` — details of the logged-in user
- Correct error codes: 400 / 401 / 409
- **DoD:** all three work end-to-end in Swagger. ⏱ 5h

## B-05 — User & Skills API
- `PUT /users/me` — update name, professional title, location, years of experience
- `GET /users/me/skills` — the user's skills
- `POST /users/me/skills` / `DELETE /users/me/skills/{id}` — manual add and remove
- **DoD:** a user can edit their profile and manage skills. ⏱ 4h

## B-06 — Jobs API
- `GET /jobs` — with parameters: `q`, `location`, `job_type`, `seniority`, `skills`, `page`, `page_size`
- Sorting: by date or by match score (if there's a CV)
- `GET /jobs/{id}` — a single job + skills + company
- A uniform response format: `{items, total, page, pages}`
- **DoD:** a search with 3 filters at once returns correct results. ⏱ 6h

## B-07 — Resume API
- `POST /resume/upload` — receive the file, validate it (PDF/DOCX, ≤5MB, magic bytes check), save to disk/storage, create a record with status `pending`, publish a message to RabbitMQ
- `GET /resume/status` — pending / processing / done / failed
- `GET /resume/analysis` — the extracted skills and data
- **DoD:** uploading a file creates a record with status pending and a message in the queue. ⏱ 6h

## B-08 — Matching Service
- A `calculate_match(user_skills, job_skills)` function that returns:
  - `score` (0–100)
  - `matched_skills`
  - `missing_skills`
- Base formula: a weight per skill according to importance (required = 2, nice-to-have = 1)
- `POST /matching/run` — computes against all jobs and stores results
- `GET /matching/results` — the stored results, sorted
- **DoD:** a user with a CV gets a list of jobs with scores that are persisted in the DB. ⏱ 8h

## B-09 — Recommendations
- Gap analysis: which skills appear most often in jobs where the score is mediocre
- `GET /recommendations` — a list of recommended skills + how many jobs each one would open up
- **DoD:** the recommendations change according to the user's CV. ⏱ 5h

## B-10 — Ingest API for the scrapers
- `POST /internal/jobs/bulk` — ingest jobs from the scraper (protected by an API key)
- Upsert by `source + external_id` to prevent duplicates
- **DoD:** sending 100 jobs twice doesn't create duplicates. ⏱ 4h

## B-11 — Error handling and logs
- Global exception handlers → a uniform error format `{error, message, detail}`
- Structured logging (JSON) with a `request_id`
- **DoD:** every server error returns valid JSON and appears in the log. ⏱ 3h

## B-12 — Tests
- pytest + `TestClient` + a separate test DB
- Coverage: auth, jobs search, matching
- **DoD:** `pytest` is green, at least 15 tests. ⏱ 6h

---

# Part C — Database (PostgreSQL)

**What we're building:** the schema that holds users, jobs, skills and results.

## D-01 — Standing up the DB
- PostgreSQL via Docker (`docker run postgres:16`)
- Create the `smartjob` DB + a dedicated user
- Connect a SQLAlchemy engine + session
- **DoD:** the backend connects successfully. ⏱ 2h

## D-02 — Core tables
```
users(id, email UNIQUE, password_hash, full_name, title,
      location, years_experience, created_at)

companies(id, name, website, industry, size, location)

jobs(id, company_id FK, title, description, location, job_type,
     seniority, salary_min, salary_max, source, external_id,
     url, posted_at, created_at)
     -- UNIQUE(source, external_id)

skills(id, name UNIQUE, category, aliases[])
```
- **DoD:** the tables exist with foreign keys. ⏱ 3h

## D-03 — Relation and analysis tables
```
resumes(id, user_id FK, file_path, original_name, status,
        error_message, uploaded_at, processed_at)

ai_analysis(id, resume_id FK, raw_text, extracted_json,
            years_experience, created_at)

user_skills(user_id FK, skill_id FK, level, source)   -- composite PK
job_skills(job_id FK, skill_id FK, importance)        -- composite PK

matching_results(id, user_id FK, job_id FK, score,
                 matched_skills[], missing_skills[], calculated_at)
                 -- UNIQUE(user_id, job_id)

recommendations(id, user_id FK, skill_id FK, reason,
                potential_jobs_count, created_at)
```
- **DoD:** you can insert user → CV → analysis → match as a chain. ⏱ 4h

## D-04 — SQLAlchemy Models
- A model per table + bidirectional `relationship()`
- `cascade="all, delete-orphan"` where needed
- **DoD:** the query `user.skills` returns objects. ⏱ 4h

## D-05 — Alembic
- `alembic init` + configure `env.py` to read from Settings
- A first migration that creates everything
- **DoD:** `alembic upgrade head` on an empty DB builds the whole schema. ⏱ 3h

## D-06 — Indexes and performance
- Indexes: `jobs(posted_at)`, `jobs(location)`, `matching_results(user_id, score DESC)`, `user_skills(user_id)`
- Full-text search on `jobs.title + description` (GIN + tsvector)
- **DoD:** `EXPLAIN ANALYZE` on a job search doesn't do a Seq Scan. ⏱ 4h

## D-07 — Seed Data
- A script that inserts ~50 jobs, 100 skills and 2 demo users
- **DoD:** you run one command and have a full system for development. ⏱ 3h

---

# Part D — AI / NLP

**What we're building:** a pipeline that turns a PDF file into a normalized list of skills.

## AI-01 — Text extraction
- Read PDF with `pdfplumber`, read DOCX with `python-docx`
- Cleanup: remove duplicate lines, fix end-of-line hyphens, collapse whitespace
- Handle the edge case: a scanned PDF with no text → return a clear error
- **DoD:** 5 different CV files return readable text. ⏱ 5h

## AI-02 — Identifying the CV structure
- Split into sections by headings: Experience / Education / Skills / Projects
- Extract date ranges to compute years of experience
- **DoD:** JSON is returned with separate sections. ⏱ 5h

## AI-03 — Skills dictionary
- Build a `skills.json` file: canonical name + synonyms
  (for example `Kubernetes` ← `k8s`, `kube`, `container orchestration`)
- At least 300 skills across development/DevOps/Data
- **DoD:** the dictionary is loaded into the DB via a script. ⏱ 5h

## AI-04 — Skill extraction (stage 1 — exact matching)
- Dictionary-based matching with the `spaCy` PhraseMatcher
- Normalization: `React.js` → `React`
- **DoD:** a sample CV returns at least 80% of the skills explicitly written in it. ⏱ 6h

## AI-05 — Skill extraction (stage 2 — semantic)
- Embeddings with `sentence-transformers` (`all-MiniLM-L6-v2`)
- Compare sentences from the CV against skill descriptions, similarity threshold ~0.6
- This is what enables: "experience in container orchestration" → Kubernetes, Docker
- **DoD:** at least 3 implied skills are identified in a test file. ⏱ 8h

## AI-06 — Skill extraction from jobs
- The same pipeline is run on `job.description`
- `importance` classification: if it appears under "Requirements" → required, under "Nice to have" → optional
- **DoD:** an ingested job automatically gets rows in `job_skills`. ⏱ 5h

## AI-07 — Calibrating the matching algorithm
- Manual review of 10 CV/job pairs — does the score make sense?
- Tune the weights and the similarity threshold
- **DoD:** a short document with 10 examples and the score each one received. ⏱ 4h

---

# Part E — Scraping

**What we're building:** collecting real jobs into the DB.

## S-01 — Scraper infrastructure
- A separate project + a uniform `JobDTO` data model
- Settings: rate limit, User-Agent, retry with backoff
- **DoD:** a dry run prints valid JSON. ⏱ 4h

## S-02 — First scraper
- A single source (the technically easiest one) — listing page + job page
- Extract: title, company, location, description, date, link, external ID
- **DoD:** 50 real jobs are collected. ⏱ 8h

## S-03 — Additional scrapers
- Two more sources following the same interface
- **DoD:** every scraper returns the same `JobDTO`. ⏱ 10h

## S-04 — Cleaning and normalization
- Deduplication: the same `title + company + location` → one entry
- Normalize job titles (`Sr. SWE` → `Senior Software Engineer`)
- Normalize locations
- **DoD:** out of 300 raw jobs, ~250 unique ones are kept. ⏱ 6h

## S-05 — Loading into the Backend
- Send to `POST /internal/jobs/bulk` in batches of 50
- Log: added / updated / failed
- **DoD:** a full run finishes with a numeric summary. ⏱ 4h

## S-06 — Scheduling
- A CronJob (in K8s) or a scheduler that runs once a day
- **DoD:** an automatic run is demonstrated twice in a row. ⏱ 3h

---

# Part F — Redis

**What we're building:** a cache layer that speeds up searches.

## R-01 — Installation and connection
- Redis in docker-compose + async `redis-py` in the backend
- **DoD:** a `PING` from code returns `PONG`. ⏱ 2h

## R-02 — Cache for job search
- Key = a hash of all the search parameters, TTL 5 minutes
- Invalidation after new jobs are loaded
- **DoD:** a second call for the same search is significantly faster (measure and document it). ⏱ 4h

## R-03 — Cache for matching results + Rate Limiting
- Store a user's `matching_results` for 10 minutes
- Rate limit on `/auth/login` and on CV upload
- **DoD:** an 11th login attempt within a minute returns 429. ⏱ 4h

---

# Part G — RabbitMQ + AI Worker

**What we're building:** background CV processing, so the user doesn't have to wait.

## Q-01 — Installation and queues
- RabbitMQ + management UI in docker-compose
- Configure an exchange + the `cv.process` queue + `cv.process.dlq` (Dead Letter)
- **DoD:** the queues can be seen in the UI on port 15672. ⏱ 3h

## Q-02 — Producer on the Backend side
- After a CV upload a message is published: `{resume_id, user_id, file_path}`
- Persistent messages + publisher confirms
- **DoD:** the message is visible in the queue after an upload. ⏱ 3h

## W-01 — Worker skeleton
- A separate Python service with a consumer, `prefetch_count=1`
- ack only after success; failure → nack to the DLQ
- **DoD:** the Worker receives a message and prints it. ⏱ 4h

## W-02 — The processing pipeline
```
receive message
  ↓ update status = processing
  ↓ text extraction (AI-01)
  ↓ structure analysis (AI-02)
  ↓ skill extraction (AI-04, AI-05)
  ↓ save to ai_analysis + user_skills
  ↓ compute matches (B-08)
  ↓ update status = done
```
- Error handling: `status = failed` + an error message
- **DoD:** a CV upload from the UI finishes in under a minute with skills displayed. ⏱ 8h

## W-03 — Resilience
- Retry up to 3 times with a delay
- Idempotency: reprocessing the same `resume_id` doesn't create duplicates
- **DoD:** killing the Worker mid-processing → the message is processed again successfully. ⏱ 5h

---

# Part H — Docker

## DK-01 — Dockerfile for the Backend
- Multi-stage, base `python:3.12-slim`, non-root user
- `HEALTHCHECK` on `/health`
- **DoD:** the image starts and serves requests. ⏱ 3h

## DK-02 — Dockerfile for the Frontend
- A build stage (node) + a serving stage (nginx)
- An nginx config that supports SPA routing
- **DoD:** refreshing at `/jobs/5` doesn't return a 404. ⏱ 3h

## DK-03 — Dockerfile for the Worker
- Includes downloading the embeddings model at build time (not at runtime)
- **DoD:** the Worker starts and connects to RabbitMQ. ⏱ 3h

## DK-04 — docker-compose
- 6 services: frontend, backend, worker, postgres, redis, rabbitmq
- `depends_on` with `condition: service_healthy`
- Volumes for data, a documented `.env.example`
- **DoD:** `docker compose up` on a clean machine brings up a working end-to-end system. ⏱ 5h

---

# Part I — Kubernetes

## K-01 — Namespace and infrastructure
- `namespace: smartjob`
- A basic ResourceQuota
- **DoD:** `kubectl get ns smartjob` works. ⏱ 1h

## K-02 — Config and Secrets
- ConfigMap: service addresses, log level
- Secret: DB password, JWT_SECRET, API keys
- **DoD:** no secret whatsoever is in any YAML that goes into git. ⏱ 3h

## K-03 — StatefulSets for infrastructure
- PostgreSQL + Redis + RabbitMQ with PVCs
- **DoD:** deleting the DB Pod doesn't delete the data. ⏱ 5h

## K-04 — Deployments
- backend (2 replicas), frontend (2), worker (1–2)
- For each: `resources.requests/limits`, `livenessProbe`, `readinessProbe`
- **DoD:** all Pods are in Running/Ready state. ⏱ 5h

## K-05 — Services and Ingress
- ClusterIP for every service
- Ingress: `/` → frontend, `/api` → backend
- TLS (cert-manager or self-signed for the demo)
- **DoD:** the system is reachable through a single address. ⏱ 4h

## K-06 — Scaling
- HPA based on CPU for the backend (2→5)
- **DoD:** a load test demonstrates a Pod being added. ⏱ 3h

---

# Part J — CI/CD (GitHub Actions)

## CI-01 — PR pipeline
```
lint → unit tests → build → security scan
```
- Runs: ruff/eslint, pytest, npm test
- **DoD:** a PR with broken code is blocked from merging. ⏱ 5h

## CI-02 — Build & Push
- Build images for the 3 services
- Tagging: `sha-<commit>` + `latest`
- Push to GHCR
- **DoD:** merging to main creates a new image in the registry. ⏱ 4h

## CI-03 — Deploy
- Update the tag in the manifests and run `kubectl apply`
- Manual approval before production
- **DoD:** a fully automatic deploy from push all the way to new Pods. ⏱ 5h

## CI-04 — Rollback
- `kubectl rollout undo` as a manual workflow
- **DoD:** returning to a previous version with one click. ⏱ 2h

---

# Part K — Security (the heart of the project)

## SEC-01 — SAST
- SonarQube or CodeQL on every PR
- **DoD:** a first report + every Critical fixed. ⏱ 4h

## SEC-02 — Dependencies
- Dependabot + `pip-audit` / `npm audit` in the pipeline
- **DoD:** the build fails on a High vulnerability. ⏱ 3h

## SEC-03 — Image scanning
- Trivy on every image after build
- **DoD:** a report clean of Criticals, or documented exceptions. ⏱ 3h

## SEC-04 — Secrets
- gitleaks on every commit
- **DoD:** an attempt to push a key is blocked. ⏱ 2h

## SEC-05 — Application security
- Input validation on every endpoint (Pydantic)
- File upload protection: type, size, magic bytes, sanitized filename, storage outside the webroot
- Security headers + a restricted CORS
- Authorization: a user only sees their own data
- **DoD:** a full OWASP Top 10 checklist with an answer for every item. ⏱ 8h

## SEC-06 — K8s security
- Non-root Pods, `readOnlyRootFilesystem`, NetworkPolicies
- **DoD:** no Pod runs as root. ⏱ 4h

---

# Part L — Monitoring

## MON-01 — Metrics
- `prometheus-fastapi-instrumentator` in the backend
- Custom metrics: CV processing time, queue length, number of matches computed
- **DoD:** `/metrics` returns data and Prometheus scrapes it. ⏱ 4h

## MON-02 — Grafana
- Dashboard 1: API health (RPS, latency, error rate)
- Dashboard 2: infrastructure (CPU, memory, Pods)
- Dashboard 3: business (CV uploads, queue length, average processing time)
- **DoD:** 3 dashboards saved as JSON in the repo. ⏱ 5h

## MON-03 — Logging
- Fluent Bit → Loki, logs in JSON format
- **DoD:** searching by `request_id` returns the entire request chain. ⏱ 4h

## MON-04 — Alerts
- Alerts: error rate > 5%, CV queue > 50, a Pod crash-looping, disk > 80%
- **DoD:** one alert was triggered on purpose and was received. ⏱ 3h

---

# Sprint board (execution order by dependencies)

| Sprint | Goal | Tasks | Achievement at the end of the sprint |
|---|---|---|---|
| 0 | Infrastructure | repo, branches, F-01, B-01, D-01 | everyone runs locally |
| 1 | Skeleton | B-02, D-02, D-03, D-04, D-05, F-02, F-03 | DB + API + navigation |
| 2 | Auth | B-03, B-04, B-05, F-05, F-06, F-07 | registration and login work |
| 3 | Jobs | D-06, D-07, B-06, F-04, F-08, F-09 | full job search |
| 4 | Scraping | S-01, S-02, S-04, S-05, B-10 | real jobs in the DB |
| 5 | CV + queues | Q-01, Q-02, W-01, B-07, F-10, AI-01, AI-02 | CV upload and background processing |
| 6 | AI | AI-03, AI-04, AI-05, AI-06, W-02 | skill extraction works |
| 7 | Matching | B-08, B-09, W-03, F-11, AI-07 | match scores and recommendations |
| 8 | Performance | R-01, R-02, R-03, B-11, B-12, F-12, F-13 | a stable, fast system |
| 9 | Containers | DK-01…DK-04, S-03, S-06 | everything runs in compose |
| 10 | K8s | K-01…K-06 | deploy to a cluster |
| 11 | CI/CD | CI-01…CI-04 | a complete pipeline |
| 12 | Security | SEC-01…SEC-06 | a security report |
| 13 | Monitoring + submission | MON-01…MON-04, documentation, demo | project ready |

**Important note:** don't wait until sprint 9 for Docker. It's recommended to write a basic `docker-compose` as early as sprint 0 (just postgres + redis + rabbitmq) so that everyone works on the same environment.

---

# Work division

| | Developer 1 — Backend | Developer 2 — Frontend | Developer 3 — Platform / AI |
|---|---|---|---|
| **Owns** | B-01…B-12, D-01…D-07 | F-01…F-13 | AI, S, Q, W, DK, K, CI, SEC, MON |
| **Sprints 0–3** | schema + Auth + Jobs API | skeleton + components + screens | scraper + compose for infrastructure |
| **Sprints 4–7** | Matching + Recommendations | CV + matches + recommendations | NLP + Worker |
| **Sprints 8–13** | performance + tests | polish + accessibility | K8s + CI/CD + Security + Monitoring |

**Interface points that must be synced early:**
1. The API contract (schemas) — lock it in sprint 1, before everyone builds on their own.
2. The `JobDTO` format between the scraper and the backend — lock it in sprint 4.
3. The Worker's result format (what gets written to `ai_analysis`) — lock it in sprint 5.

---

# Numeric summary

| Area | Tasks | Estimated hours |
|---|---|---|
| Frontend | 13 | ~62 |
| Backend | 12 | ~55 |
| Database | 7 | ~23 |
| AI/NLP | 7 | ~38 |
| Scraping | 6 | ~35 |
| Redis | 3 | ~10 |
| RabbitMQ + Worker | 5 | ~23 |
| Docker | 4 | ~14 |
| Kubernetes | 6 | ~21 |
| CI/CD | 4 | ~16 |
| Security | 6 | ~24 |
| Monitoring | 4 | ~16 |
| **Total** | **77** | **~337 hours** |

~337 hours ÷ 3 people ≈ **112 hours per person**. At a pace of 10 hours a week — about 11 weeks.
