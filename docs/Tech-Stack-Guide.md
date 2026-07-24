# Tooling Guide — Frontend & Backend

An explanatory document for every tool in the stack: **what it is, which problem it solves, what it looks like in code, and where exactly it is used in our project.**

---

# Part A — Frontend

## The big picture

```
The user sees a page
   ↓
React  ← builds what you see on the screen
   ↓
TypeScript  ← makes sure there are no mistakes in the code before it runs
   ↓
Tailwind  ← gives it its styling
   ↓
Axios  ← sends requests to the server
   ↓
TanStack Query  ← manages the responses: cache, loading, errors
```

Five tools, each with one clear job. They don't overlap.

---

## 1. React

### What it is
A library for building user interfaces. Instead of writing static HTML and updating it manually in JavaScript, you describe **how the screen should look given some data**, and React takes care of updating the page when the data changes.

### The problem it solves
Without React, in order to add a job to a list you'd have to write:
```javascript
const li = document.createElement('li');
li.textContent = job.title;
document.getElementById('jobs-list').appendChild(li);
// and now remember to remove it when it's no longer relevant...
```
In a project with 8 screens this turns into a mess that can't be maintained.

With React you simply say "the list should display this array":
```jsx
{jobs.map(job => <JobCard key={job.id} job={job} />)}
```
The array changed? The screen updates by itself.

### The fundamental concepts you must know

**Component** — a function that returns UI. This is the basic building block.
```jsx
function JobCard({ job }) {
  return (
    <div className="border rounded p-4">
      <h3>{job.title}</h3>
      <p>{job.company_name}</p>
    </div>
  );
}
```

**Props** — data a component receives from the outside (like parameters to a function). In the example above, `job` is a prop.

**State** — data the component holds itself and that can change. When it changes, the component re-renders itself.
```jsx
const [searchText, setSearchText] = useState("");
// searchText = the current value
// setSearchText = the function that changes it
```

**useEffect** — code that runs after the component is displayed, or when something changes. Used for things "outside of React" (timers, listeners). **Important note:** we will not use it for API calls — that's what TanStack Query is for.

### In our project
Every screen is a component: `JobsSearch`, `Dashboard`, `ResumeUpload`. Inside them are smaller components: `JobCard`, `SkillBadge`, `MatchScoreCard`. That same `JobCard` is used in the dashboard, in search and in the matching results — you write it once and use it in three places.

### Why React and not Vue/Angular
React is the most widespread in the industry — the most learning material, the most libraries, and the most relevant for a resume. Angular is too heavy for a project of this size.

---

## 2. TypeScript

### What it is
JavaScript with **types**. You declare which kind of data each variable holds, and the tool checks that you didn't make a mistake — **before** the code runs.

### The problem it solves
In plain JavaScript:
```javascript
console.log(job.company.name);
```
If the server returned `company_name` and not `company`, you'll only find out when the page crashes for the user.

In TypeScript:
```typescript
interface Job {
  id: number;
  title: string;
  company_name: string;
  match_score: number | null;   // can be null!
  skills: string[];
}

console.log(job.company.name);
// ❌ a red error in the editor, before running:
// Property 'company' does not exist on type 'Job'
```

### The biggest benefit — Autocomplete
Once you define the type a single time, the editor knows how to complete field names for you everywhere in the project. Instead of going back to the API docs every time, you type `job.` and see all the options.

### In our project
We'll define a type for every backend response in the file `src/types/api.ts`:
```typescript
export interface MatchResult {
  job: Job;
  score: number;
  matched_skills: string[];
  missing_skills: string[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}
```
This also serves as living documentation of the API contract — anyone reading the file knows exactly what the server returns.

### Practical tip
Start out without `any`. The temptation to use `any` when something doesn't work is strong, but it cancels out the entire benefit.

---

## 3. Tailwind CSS

### What it is
A CSS library where you style things through **small classes** written directly in the HTML, instead of writing separate CSS files.

### The comparison
Regular CSS:
```css
/* styles.css */
.job-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```
```html
<div class="job-card">...</div>
```

Tailwind:
```html
<div class="border border-gray-200 rounded-lg p-4 flex flex-col gap-2">...</div>
```

### Why it's better in a project like this
1. **You don't have to invent names.** Most of the time spent on CSS goes to "what should I call this class".
2. **You see the styling in the place where it applies.** No jumping between files.
3. **Deleting a component deletes its styling too.** In a global CSS file, dead code accumulates that nobody dares delete.
4. **Built-in consistency.** `p-4` is always 16px. There's no situation where one developer wrote 15px and another 17px.

### Syntax worth knowing
```
p-4      padding: 16px          (the numbers go in steps of 4px)
mt-2     margin-top: 8px
flex     display: flex
gap-3    spacing between children
text-lg  text size
font-bold
bg-blue-600 / text-white / border-gray-200
rounded-lg
hover:bg-blue-700     ← hover state
md:grid-cols-3        ← only on medium screens and up (responsiveness)
```

### The common criticism
"The HTML gets ugly with 15 classes." That's true — and the solution is React: you write the classes once inside `JobCard`, and then use `<JobCard />` everywhere. The ugliness is concentrated in one place.

---

## 4. Vite (the build tool)

Not in the table, but necessary — this is what runs the project.

**What it does:** it runs a local development server with **Hot Module Replacement** — you save a file and the browser updates immediately without refreshing and without losing the page state. At build time it packages all the code into minified static files.

```bash
npm create vite@latest frontend -- --template react-ts
npm run dev     # development
npm run build   # production → dist/ folder
```

---

## 5. Axios

### What it is
A library for sending HTTP requests. A convenient replacement for the browser's built-in `fetch`.

### Why not just fetch
```javascript
// fetch
const res = await fetch('/api/jobs');
if (!res.ok) throw new Error('failed');   // fetch doesn't throw on 404/500!
const data = await res.json();

// axios
const { data } = await api.get('/jobs');  // throws by itself, parses JSON by itself
```

### The main advantage — Interceptors
Code that runs automatically before every request or after every response. This is what saves us from writing the same thing again in every call.

```typescript
// src/api/client.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,   // http://localhost:8000
  timeout: 15000,
});

// before every request — add the token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// after every response — if the token expired, log the user out
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**What we gained:** no API call in the project needs to know that a token exists at all. We wrote it once.

### In our project
All the calls go through `client.ts`. The API functions are grouped by topic:
```typescript
// src/api/jobs.ts
export const jobsApi = {
  search: (params: JobSearchParams) =>
    api.get<Paginated<Job>>('/jobs', { params }).then(r => r.data),

  getById: (id: number) =>
    api.get<Job>(`/jobs/${id}`).then(r => r.data),
};
```

---

## 6. TanStack Query

### What it is
A library for managing **data that comes from the server**. It's the tool that's least familiar to beginners, and the one that changes code quality the most.

### The problem it solves
Without TanStack Query, every call to the server looks like this:
```jsx
const [jobs, setJobs] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  setIsLoading(true);
  jobsApi.search(filters)
    .then(data => setJobs(data.items))
    .catch(err => setError(err))
    .finally(() => setIsLoading(false));
}, [filters]);
```
**14 lines, and you'll duplicate that same code across 8 screens.** And it's still missing: cache, cancelling a stale request that came back late, refetching, retry.

### With TanStack Query
```jsx
const { data, isLoading, error } = useQuery({
  queryKey: ['jobs', filters],
  queryFn: () => jobsApi.search(filters),
});
```
**3 lines, and it includes everything that was missing above.**

### What happens behind the scenes

**`queryKey`** — the identity card of the data. This is the heart of the library:
- Two screens with the same key → **only one request** to the server, both get the result
- The key changed (the user changed a filter) → a new request automatically
- You returned to a screen you already visited → the data is displayed **immediately** from the cache, and only then refreshed in the background

**What else you get for free:**
- Automatic retry on a network failure
- Refetch when you come back to the browser tab
- Prevention of duplicate simultaneous requests
- `isFetching` separate from `isLoading` (a background refresh doesn't make the screen flicker)

### Mutations — for changing data
```jsx
const uploadMutation = useMutation({
  mutationFn: (file: File) => resumeApi.upload(file),
  onSuccess: () => {
    // the CV changed → the matching results are no longer valid
    queryClient.invalidateQueries({ queryKey: ['matching'] });
  },
});

<button onClick={() => uploadMutation.mutate(file)}
        disabled={uploadMutation.isPending}>
  {uploadMutation.isPending ? 'Uploading...' : 'Upload CV'}
</button>
```
`invalidateQueries` marks data as invalid, and every screen that uses it will reload it automatically.

### A special use for us — Polling
Processing the CV takes time and runs in the background. TanStack Query knows how to ask the server again and again until it's done:
```jsx
const { data: status } = useQuery({
  queryKey: ['resume-status'],
  queryFn: resumeApi.getStatus,
  refetchInterval: (query) =>
    query.state.data?.status === 'done' ? false : 3000,
  // asks every 3 seconds, stops when it's finished
});
```

### Important to understand: this is not Redux
| | TanStack Query | Redux / Zustand |
|---|---|---|
| **What it's for** | data from the server | local application state |
| **Example** | job list, matching results | whether the sidebar is open, a form being edited |

In our project almost everything is server data, so **we won't need Redux at all**. For who's logged in we'll use a simple Context.

---

## What it looks like all together — a real screen

```tsx
export function JobsSearch() {
  const [filters, setFilters] = useState<JobSearchParams>({ page: 1 });

  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => jobsApi.search(filters),
  });

  if (isLoading) return <Spinner />;
  if (error)     return <ErrorMessage error={error} />;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <SearchBar onSearch={q => setFilters(f => ({ ...f, q, page: 1 }))} />

      <div className="grid gap-4 mt-6 md:grid-cols-2">
        {data.items.map(job => <JobCard key={job.id} job={job} />)}
      </div>

      <Pagination
        page={data.page}
        pages={data.pages}
        onChange={page => setFilters(f => ({ ...f, page }))}
      />
    </div>
  );
}
```

**Each tool and its role in this code:**
- **React** — the component and the re-render when `filters` changes
- **TypeScript** — `JobSearchParams` and `data.items` are defined and validated
- **Tailwind** — `max-w-5xl mx-auto p-6 grid gap-4 md:grid-cols-2`
- **Axios** — inside `jobsApi.search`, adding the token
- **TanStack Query** — `useQuery`, the cache, the loading and the error

---
---

# Part B — Backend

## The big picture

```
A request from the Frontend
   ↓
FastAPI  ← receives, validates input, routes
   ↓
Pydantic  ← checks that the data is valid
   ↓
Redis  ← is there a stored answer? return it immediately
   ↓
SQLAlchemy  ← translation between Python and SQL
   ↓
PostgreSQL  ← the data itself

In parallel, for heavy processes:
RabbitMQ → AI Worker → pdfplumber → spaCy → Sentence Transformers
```

---

## 7. Python + FastAPI

### Why Python for this project
The entire NLP and AI world is written in Python. spaCy, Sentence Transformers, pdfplumber — they're all Python libraries. If we chose Node.js for the backend, we'd need a separate Python service just for the AI. Python lets us write everything in one language.

### What FastAPI is
A framework for building REST APIs. Three things set it apart:

**a. Automatic validation from types**
```python
@router.get("/jobs/{job_id}")
def get_job(job_id: int):
    ...
```
Someone sent `/jobs/abc`? FastAPI returns a 422 with a clear error message, without you writing a single line of validation.

**b. Free interactive documentation**
Every endpoint you write automatically appears at `http://localhost:8000/docs` — with a form you can send real requests from. **This is the most useful development tool you'll have.** The frontend developer can see exactly what the API returns without asking you.

**c. Built-in Async**
```python
async def search_jobs(...):
    cached = await redis.get(key)      # while waiting,
    rows = await db.execute(query)     # the server handles other requests
```
Important for us because a lot of time is spent waiting on the DB, on Redis and on the queue.

### The key concept — Dependency Injection
This is the feature that changes the structure of the code in FastAPI the most. Instead of every endpoint handling authentication and the DB connection itself:

```python
# define it once
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    payload = decode_token(token)
    user = db.query(User).get(payload["sub"])
    if not user:
        raise HTTPException(401, "Invalid credentials")
    return user

# and use it everywhere
@router.get("/users/me")
def me(user: User = Depends(get_current_user)):
    return user          # if we got here — the user is authenticated. Period.
```

The line `user: User = Depends(get_current_user)` guarantees authentication, delivers the user, and also makes the endpoint appear as protected in the documentation.

### The layered structure we'll work by
```
routers/      HTTP only — receives a request, returns a response. No logic here.
services/     the business logic — "how a match score is computed"
repositories/ DB access — queries only
models/       tables (SQLAlchemy)
schemas/      the input/output contract (Pydantic)
```

**Why this matters:** `calculate_match()` can be unit-tested without starting a server and without a DB. And on top of that — the AI Worker, which is a completely separate process, calls the very same service. If the logic lived inside the router, we'd have to duplicate it.

---

## 8. Pydantic

Ships together with FastAPI and is responsible for the **data contract**.

```python
# schemas/job.py
from pydantic import BaseModel, Field

class JobOut(BaseModel):
    id: int
    title: str
    company_name: str
    match_score: float | None = None
    skills: list[str]

    model_config = {"from_attributes": True}   # converts a SQLAlchemy object

class JobSearchParams(BaseModel):
    q: str | None = None
    location: str | None = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)   # won't allow 10000
```

**Three benefits:**
1. **Input validation** — protection against malicious or invalid data (this is a security item too!)
2. **Output filtering** — if `JobOut` doesn't include `password_hash`, it won't leak out even if it exists on the model
3. **The API document** — these schemas are exactly what will appear at `/docs` and what the frontend will translate into TypeScript interfaces

---

## 9. PostgreSQL

### What it is
A relational database — data in tables with relationships between them.

### Why relational and not MongoDB
Because our data is **primarily relationships**:
```
user  ←→ skills  (many-to-many)
job   ←→ skills  (many-to-many)
user  ←→ job     through a matching result
```
The central question of the system is "which jobs require skills that this user has" — that's a classic JOIN query. In MongoDB we'd be fighting against it.

### Specific capabilities we'll use

**Full-Text Search** — free-text search in job descriptions, built into the database:
```sql
SELECT * FROM jobs
WHERE to_tsvector('english', title || ' ' || description)
      @@ plainto_tsquery('english', 'kubernetes devops');
```
This saves us from standing up a separate Elasticsearch.

**Arrays** — `missing_skills` is stored as an array in a single column instead of an additional table.

**JSONB** — the raw AI output is stored as JSON, and you can search inside it.

**Indexes** — without them, a search over 10,000 jobs will scan the whole table on every request.

---

## 10. SQLAlchemy (ORM)

### What an ORM is
Object Relational Mapper — you write Python, you get SQL.

```python
# without an ORM
cursor.execute(
    "SELECT * FROM jobs WHERE location = %s LIMIT %s", (location, 20)
)
rows = cursor.fetchall()
title = rows[0][2]          # ...which column is 2 again?

# with an ORM
jobs = db.query(Job).filter(Job.location == location).limit(20).all()
title = jobs[0].title       # clear
```

### Defining a model
```python
class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"))
    posted_at = Column(DateTime, index=True)

    company = relationship("Company", back_populates="jobs")
    skills = relationship("Skill", secondary="job_skills")
```

The last line enables:
```python
job.company.name          # SQLAlchemy performs the JOIN
[s.name for s in job.skills]
```

### The biggest advantage — protection against SQL Injection
```python
# dangerous — never write it this way
db.execute(f"SELECT * FROM users WHERE email = '{email}'")
# email = "' OR '1'='1"  →  leaked all the users

# ORM — parameters are separated from the query, protected automatically
db.query(User).filter(User.email == email).first()
```
This is a direct item in the OWASP Top 10 that we'll need to show in the security part.

### A trap you must know about — N+1
```python
jobs = db.query(Job).limit(50).all()
for job in jobs:
    print(job.company.name)    # ⚠️ 50 additional queries!
```
The solution:
```python
jobs = db.query(Job).options(joinedload(Job.company)).limit(50).all()
# a single query with a JOIN
```
This is the most common cause of a slow API. Worth checking when you get to the performance sprint.

---

## 11. Alembic (Migrations)

### The problem
The DB is already running with real data, and you need to add a column. What do you do? Drop it and rebuild? Write SQL commands in a file and hope everyone runs them?

### The solution
Alembic generates a **numbered migration file** for every schema change, and stores it in git alongside the code.

```bash
# you changed the model in Python:
alembic revision --autogenerate -m "add salary columns"
# → migrations/versions/a1b2c3_add_salary_columns.py is created

alembic upgrade head    # applies the change
alembic downgrade -1    # reverts it
```

```python
def upgrade():
    op.add_column('jobs', sa.Column('salary_min', sa.Integer()))

def downgrade():
    op.drop_column('jobs', 'salary_min')
```

**Why this is critical in a team project:** every developer pulls the changes from git and runs `alembic upgrade head` — and their DB is identical to everyone else's. And in CI/CD, this is the command that runs automatically before every deployment.

---

## 12. Redis

### What it is
A key-value database that lives **in memory** (RAM). Reading from it takes microseconds, compared to milliseconds from PostgreSQL.

### Use 1 — Cache for searches
The search "DevOps in Tel Aviv" runs dozens of times a day and returns the same answer. There's no reason to run that same query over and over.

```python
async def search_jobs(params, db, redis):
    key = f"jobs:{hash_params(params)}"

    cached = await redis.get(key)
    if cached:
        return json.loads(cached)          # ~1ms

    result = await jobs_repo.search(db, params)   # ~150ms
    await redis.setex(key, 300, json.dumps(result))  # store for 5 minutes
    return result
```

**TTL** (Time To Live) is the important mechanism: the data deletes itself after 5 minutes, so new jobs will show up without us having to clear anything manually.

### Use 2 — Rate Limiting
Protection against account break-in attempts:
```python
async def check_rate_limit(ip: str, redis):
    key = f"login_attempts:{ip}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 60)
    if count > 10:
        raise HTTPException(429, "Too many attempts")
```
10 login attempts per minute — and then a block. A security item that's easy to show in a demo.

### Use 3 — Temporary data
A user's matching results, which are expensive to compute, are stored for 10 minutes.

### An important point
Redis is **in memory** — a crash wipes everything. Therefore: never store anything in it that doesn't have a source of truth in PostgreSQL. It is an acceleration layer only.

---

## 13. RabbitMQ

### The problem it solves
A user uploads a CV. The processing — reading the PDF, NLP analysis, computing embeddings, comparing against all the jobs — takes 30–60 seconds.

Without a queue:
```
POST /resume/upload
  ↓ the user stares at a loading screen for 60 seconds
  ↓ the browser might drop the connection (timeout)
  ↓ the API server is busy and isn't handling other requests
```

With a queue:
```
POST /resume/upload
  ↓ save the file, publish a message to the queue
  ↓ return 202 Accepted within 200ms  ✅
  ↓ the user keeps browsing

  [in the background] a Worker takes it from the queue and processes it
  ↓ updates status = done
  ↓ the Frontend, which is polling, displays the result
```

### The fundamental concepts
- **Producer** — whoever publishes a message (the backend)
- **Queue** — the queue holding waiting messages
- **Consumer** — whoever reads and processes (the AI Worker)
- **ACK** — confirmation that the message was handled successfully. **Without an ACK, the message goes back into the queue.**

### Why this matters so much for us
```python
def on_message(ch, method, body):
    try:
        process_cv(json.loads(body))
        ch.basic_ack(method.delivery_tag)          # success → remove from the queue
    except Exception:
        ch.basic_nack(method.delivery_tag, requeue=False)   # → DLQ
```
If the Worker crashes mid-processing — there's no ACK, and RabbitMQ returns the message to the queue. **No CV gets lost.** This is exactly the kind of resilience that's expected in a DevSecOps project.

### Additional concepts we'll use
- **Dead Letter Queue (DLQ)** — a side queue for messages that failed repeatedly. Instead of blocking the main queue, they wait there for manual inspection.
- **Prefetch = 1** — a Worker takes one message at a time. Prevents a situation where one Worker "grabbed" 50 messages and then crashed.
- **Scaling** — the queue got long? You start another Worker, and they split the work automatically. This is what we'll demonstrate in Kubernetes.

### RabbitMQ vs Redis Queue / Celery
Redis can serve as a simple queue, but without reliability guarantees. Celery is a layer on top (usually on top of RabbitMQ) that makes writing easier — it's worth considering, but working directly with RabbitMQ teaches you what's really happening, and that's worth more in a learning project.

---

## 14. pdfplumber

### What it is
A library for extracting text from PDF files.

```python
import pdfplumber

def extract_text(path: str) -> str:
    with pdfplumber.open(path) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)
```

### Why this one specifically
PDF is a format of **visual positioning**, not of ordered text. It says "the word Python is at coordinate (72, 340)" — not "this is the second line". A two-column resume is a nightmare: a naive reader will mix the columns into gibberish.

pdfplumber gives access to the exact position of every word, so you can identify columns and read them correctly.

### What you must handle
```python
text = extract_text(path)
if len(text.strip()) < 100:
    raise ValueError("PDF with no text — probably a scanned file")
```
A CV that was scanned from paper is essentially an image. There's no text in it to extract. **You must return a clear error message to the user** and not fail silently.

---

## 15. spaCy

### What it is
An NLP (natural language processing) library for analyzing text: identifying words, sentences, parts of speech and entities.

### What we'll use it for — PhraseMatcher
Fast identification of skills from a dictionary:

```python
import spacy
from spacy.matcher import PhraseMatcher

nlp = spacy.load("en_core_web_sm")
matcher = PhraseMatcher(nlp.vocab, attr="LOWER")

skills = ["Kubernetes", "Docker", "React", "PostgreSQL", "CI/CD"]
matcher.add("SKILL", [nlp(s) for s in skills])

doc = nlp(cv_text)
found = {doc[start:end].text for _, start, end in matcher(doc)}
```

### Why not just string search
```python
"react" in "I have experience with reactive programming"   # ❌ a false True
```
spaCy splits by real word boundaries and won't get caught by that. It also handles inflections (`developing` → `develop`).

### Another use — Lemmatization and sentence splitting
We'll need sentence splitting for the next stage: to compare sentence by sentence against skill descriptions.

### Limitation
spaCy only finds what's written explicitly. `"experience in container orchestration"` doesn't contain the word Kubernetes, so spaCy will miss it. That's what the next tool is for.

---

## 16. Sentence Transformers

### What it is
A model that converts **a sentence into a vector of numbers** (an embedding), so that sentences with similar meaning get close vectors — even if they don't share a single word.

```python
from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer('all-MiniLM-L6-v2')

a = model.encode("Experience with container orchestration")
b = model.encode("Kubernetes")
c = model.encode("Graphic design in Photoshop")

util.cos_sim(a, b)   # ≈ 0.71  ← similar!
util.cos_sim(a, c)   # ≈ 0.08  ← unrelated
```

**This is the heart of the "smart" in Smart Job Platform.** Without it, our system is an improved Ctrl+F.

### How we'll actually use it
```python
# once — compute an embedding for every skill and store it
skill_vectors = model.encode([s.description for s in all_skills])

# for every sentence in the CV
for sentence in cv_sentences:
    vec = model.encode(sentence)
    scores = util.cos_sim(vec, skill_vectors)[0]
    for idx, score in enumerate(scores):
        if score > 0.60:
            found_skills.add(all_skills[idx])
```

### Practical things you must know
- **`all-MiniLM-L6-v2`** — 80MB, fast, runs on CPU. Perfect for this project. Don't start with a 2GB model.
- **You must download the model at `docker build` time**, not at runtime. Otherwise every Worker startup will download 80MB from the internet.
- **The threshold (0.60) is a parameter that requires calibration.** Too low → every job matches everyone. Too high → no results. That's task AI-07 in the plan.
- This is an **English** model. Resumes in Hebrew require a multilingual model (`paraphrase-multilingual-MiniLM-L12-v2`).

---

## 17. LLM API (Claude / GPT)

### Where it fits in
Not into the whole pipeline — **only into the parts that require judgment, not identification.** API calls cost money and take seconds, so use them wisely.

### Three recommended uses

**a. Structured extraction in complicated cases** — when the regular pipeline returns a weak result:
```python
prompt = f"""Extract skills from this CV section.
Return ONLY valid JSON: {{"skills": [], "years_experience": 0}}

{cv_section}"""
```

**b. Phrasing an explanation for a match** — instead of "score 72%", the user gets:
> "You're a fit for this job thanks to your experience with Docker and CI/CD. The main gap is Kubernetes, which appears as a mandatory requirement."

**c. Personalized recommendations** — "Based on the 5 jobs you matched best with, the most worthwhile skill to learn is X, because it will open up 12 more jobs for you."

### Rules of engagement
1. **Always alongside the local pipeline, never instead of it.** spaCy + Sentence Transformers do 80% of the work for free and predictably.
2. **Ask for JSON explicitly** and wrap the parsing in try/except — the model may add text around it.
3. **The key goes in a Secret**, never in the code. Checked by gitleaks in CI.
4. **Timeout and fallback** — if the API isn't available, the system has to keep working without it.

---

# How it all connects — the journey of a CV upload

```
1. The user picks a file on the ResumeUpload screen
   React (state) + Tailwind (styling) + TypeScript (File type)

2. Clicking "Upload"
   TanStack Query useMutation → Axios POST /resume/upload
   The Axios interceptor adds the JWT

3. FastAPI receives it
   Pydantic validates the file type and size
   Depends(get_current_user) authenticates the token

4. The Service saves the file and creates a record
   SQLAlchemy → PostgreSQL: resumes(status='pending')

5. The Producer publishes a message
   RabbitMQ queue: cv.process

6. The server returns 202 within ~200ms
   TanStack Query starts polling every 3 seconds

   ─── from here on in the background, in a separate Worker ───

7. The Worker takes it off the queue, status = 'processing'
8. pdfplumber extracts the text from the PDF
9. spaCy splits into sentences and identifies explicit skills
10. Sentence Transformers identifies implied skills
11. SQLAlchemy saves to ai_analysis + user_skills
12. The Matching Service compares against all the jobs
13. Results go to matching_results, status = 'done'
14. ACK to RabbitMQ — the message is removed from the queue

   ─── back to the user ───

15. The polling gets status = 'done' and stops
16. TanStack Query invalidates → loads the skills and the results
17. The screen displays a SkillBadge for each skill and a MatchScoreCard for each job
```

---

# Summary table

| Layer | Tool | In one line |
|---|---|---|
| UI | **React** | builds screens from components that update by themselves |
| Code safety | **TypeScript** | catches mistakes before running |
| Styling | **Tailwind** | styling via small classes inside the HTML |
| Build | **Vite** | fast dev server + packaging for production |
| HTTP | **Axios** | sends requests, adds the token automatically |
| Server data | **TanStack Query** | cache, loading, errors and refetching with no code |
| API | **FastAPI** | fast REST with automatic validation and documentation |
| Data contract | **Pydantic** | validates input and filters output |
| Storage | **PostgreSQL** | tables, relationships, text search |
| DB access | **SQLAlchemy** | Python instead of SQL, protected from injection |
| Schema changes | **Alembic** | version-controlled migrations in git |
| Speed | **Redis** | in-memory cache + rate limiting |
| Asynchronous | **RabbitMQ** | moves heavy work to the background without losing tasks |
| Files | **pdfplumber** | extracts text from PDFs |
| NLP | **spaCy** | identifies skills written explicitly |
| Semantics | **Sentence Transformers** | identifies implied skills by meaning |
| Judgment | **LLM API** | explanations and recommendations in natural language |

---

# Recommended learning order

If you don't know the tools, don't learn them all in parallel. This order matches the build order:

1. **FastAPI + Pydantic** — within a day or two you have a working API at `/docs`
2. **SQLAlchemy + Alembic** — the most traps, worth the time
3. **React + TypeScript** — together, not separately
4. **Tailwind** — learn it as you go, no course needed
5. **Axios + TanStack Query** — two days, and it saves weeks
6. **pdfplumber + spaCy** — straight into the code, relatively simple
7. **RabbitMQ** — only when you get to background processing
8. **Redis** — the easiest, can be left for last
9. **Sentence Transformers** — the most interesting, and requires the most trial and error
