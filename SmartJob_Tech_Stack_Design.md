# SmartJob Platform – Frontend & Backend Technical Design

## מטרת הפרויקט
SmartJob היא פלטפורמה חכמה למציאת עבודה המבוססת על Web Scraping ו-AI.

המערכת תאפשר למשתמש:
- להעלות קורות חיים (CV)
- לחפש משרות
- לקבל התאמה (Matching Score)
- להבין אילו Skills חסרים
- לקבל המלצות לשיפור

---

# ארכיטקטורת המערכת

הפרויקט מחולק ל-3 מערכות:

1. **Scraping System**
   - אוסף מודעות דרושים מאתרי דרושים.
   - מנרמל את הנתונים.
   - שולח אותם למסד הנתונים.

2. **Database System**
   - שומר משתמשים, משרות, Skills, תוצאות AI ותוצאות Matching.

3. **Frontend + Backend** *(באחריותנו)*
   - ממשק המשתמש.
   - REST API.
   - לוגיקה עסקית.
   - אינטגרציה עם AI.

---

# Tech Stack

## Frontend

### React
ספריית UI לבניית ממשק המשתמש באמצעות Components.

**משמש עבור:**
- Dashboard
- Login
- Resume Upload
- Job Search
- Matching Results

### TypeScript
JavaScript עם טיפוסים.
מקטין באגים ומשפר עבודה בצוות.

### Tailwind CSS
Framework לעיצוב מהיר ועקבי של הממשק.

### Axios
ספרייה לביצוע קריאות HTTP אל ה-Backend.

### TanStack Query
מנהל קריאות API, Cache, Loading ו-Refetch בצורה יעילה.

---

## Backend

### Python
שפת הפיתוח הראשית.
נבחרה בזכות התמיכה הרחבה ב-AI וב-NLP.

### FastAPI
Framework לבניית REST APIs.

**ישמש עבור:**
- Authentication
- Users API
- Jobs API
- Resume API
- Matching API

### SQLAlchemy
ORM המאפשר עבודה מול PostgreSQL באמצעות אובייקטים במקום SQL גולמי.

### Alembic
ניהול גרסאות (Migrations) של מסד הנתונים.

---

## Database

### PostgreSQL
מסד נתונים רלציוני.

ישמור:
- Users
- Jobs
- Companies
- Skills
- Resumes
- Matching Results

---

## Performance

### Redis
Cache מהיר לשיפור ביצועים.

שימושים:
- Job Search Cache
- Temporary Data
- Session Cache

---

## Async Processing

### RabbitMQ
Message Queue להרצת משימות ארוכות ברקע.

דוגמה:
1. המשתמש מעלה CV.
2. ה-Backend מחזיר תשובה מיד.
3. RabbitMQ שולח את המשימה ל-AI Worker.
4. ה-AI מעבד את הקובץ ומעדכן את בסיס הנתונים.

---

## AI

### pdfplumber
חילוץ טקסט מקבצי PDF.

### python-docx
חילוץ טקסט מקבצי Word.

### spaCy
זיהוי Skills, Technologies ותפקידים מתוך הטקסט.

### Sentence Transformers
השוואה סמנטית בין Skills של משתמש לדרישות משרה.

### LLM API (שלב מתקדם)
יצירת המלצות מותאמות אישית לשיפור קורות החיים.

---

# Infrastructure

## Docker
מריץ את כל השירותים בסביבה אחידה.

Containers:
- Frontend
- Backend
- PostgreSQL
- Redis
- RabbitMQ
- AI Worker

## Kubernetes
אחראי על:
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
- bcrypt/Argon2 – הצפנת סיסמאות
- Pydantic – Validation
- Kubernetes Secrets – שמירת סודות

---

## Monitoring

### Prometheus
איסוף Metrics.

### Grafana
Dashboards וגרפים.

### Loki + Fluent Bit
איסוף וריכוז Logs.

---

# סדר פיתוח מומלץ

1. הקמת Repository
2. הקמת Backend
3. הקמת Database
4. הקמת Frontend
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

הגרסה הראשונה תכלול:
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
