# SmartJob Platform – Frontend & Backend Technical Design

## Project Goal
SmartJob is a smart job-finding platform based on Web Scraping and AI.

The system will allow the user to:
- Upload a resume (CV)
- Search for jobs
- Receive a Matching Score
- Understand which Skills are missing
- Get recommendations for improvement

---

# System Architecture

The project is divided into 3 systems:

1. **Scraping System**
   - Collects job listings from job boards.
   - Normalizes the data.
   - Sends it to the database.

2. **Database System**
   - Stores users, jobs, Skills, AI results and Matching results.

3. **Frontend + Backend** *(our responsibility)*
   - The user interface.
   - REST API.
   - Business logic.
   - AI integration.

---

# Tech Stack

## Frontend

### React
A UI library for building the user interface using Components.

**Used for:**
- Dashboard
- Login
- Resume Upload
- Job Search
- Matching Results

### TypeScript
JavaScript with types.
Reduces bugs and improves teamwork.

### Tailwind CSS
A framework for fast, consistent styling of the interface.

### Axios
A library for making HTTP calls to the Backend.

### TanStack Query
Manages API calls, Cache, Loading and Refetch efficiently.

---

## Backend

### Python
The main development language.
Chosen for its broad support for AI and NLP.

### FastAPI
A framework for building REST APIs.

**Will be used for:**
- Authentication
- Users API
- Jobs API
- Resume API
- Matching API

### SQLAlchemy
An ORM that enables working with PostgreSQL through objects instead of raw SQL.

### Alembic
Version management (Migrations) for the database.

---

## Database

### PostgreSQL
A relational database.

It will store:
- Users
- Jobs
- Companies
- Skills
- Resumes
- Matching Results

---

## Performance

### Redis
A fast Cache for improving performance.

Uses:
- Job Search Cache
- Temporary Data
- Session Cache

---

## Async Processing

### RabbitMQ
A Message Queue for running long tasks in the background.

Example:
1. The user uploads a CV.
2. The Backend returns a response immediately.
3. RabbitMQ sends the task to the AI Worker.
4. The AI processes the file and updates the database.

---

## AI

### pdfplumber
Text extraction from PDF files.

### python-docx
Text extraction from Word files.

### spaCy
Identification of Skills, Technologies and job titles within the text.

### Sentence Transformers
Semantic comparison between a user's Skills and a job's requirements.

### LLM API (advanced stage)
Generating personalized recommendations for improving the resume.

---

# Infrastructure

## Docker
Runs all services in a uniform environment.

Containers:
- Frontend
- Backend
- PostgreSQL
- Redis
- RabbitMQ
- AI Worker

## Kubernetes
Responsible for:
- Deployments
- Scaling
- Self-Healing
- Networking

---

## CI/CD

### GitHub Actions

Pipeline:
1. Git Push
2. Tests
3. Security Scan
4. Docker Build
5. Deploy

---

## Security

- JWT – Authentication
- bcrypt/Argon2 – password hashing
- Pydantic – Validation
- Kubernetes Secrets – storing secrets

---

## Monitoring

### Prometheus
Metrics collection.

### Grafana
Dashboards and graphs.

### Loki + Fluent Bit
Log collection and aggregation.

---

# Recommended Development Order

1. Set up the Repository
2. Set up the Backend
3. Set up the Database
4. Set up the Frontend
5. Authentication
6. Jobs Module
7. Resume Upload
8. AI Processing
9. Matching Engine
10. Docker
11. Kubernetes
12. CI/CD
13. Monitoring

---

# MVP

The first version will include:
- Login/Register
- Upload CV
- Job Search
- Resume Analysis
- Matching Score
- Missing Skills
- Dashboard

Future Enhancements:
- GPT Resume Improvement
- Interview Preparation
- Recruiter Portal
- Machine Learning Recommendations
