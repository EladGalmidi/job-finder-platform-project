# תוכנית ביצוע מפורקת למשימות — Smart Job Platform

**איך לקרוא את המסמך:**
- לכל משימה יש **מזהה** (למשל `B-03`) — כדי לפתוח ממנו Issue ב-GitHub.
- לכל משימה יש **DoD** (Definition of Done) — מתי מותר לסמן ✅.
- **הערכת זמן** = שעות עבודה נטו של מפתח אחד.
- בסוף המסמך יש **לוח ספרינטים** שמסדר את כל המשימות לפי סדר ביצוע ותלויות.

**כלל ברזל:** אף משימה לא נסגרת בלי (1) קוד ב-branch, (2) בדיקה ידנית שעובד, (3) PR ממוזג.

---

# חלק א' — Frontend (React + TypeScript)

**מה בונים:** אתר שמאפשר להירשם, להעלות קורות חיים, לחפש משרות, ולראות ציון התאמה + המלצות.

## F-01 — הקמת פרויקט
- `npm create vite@latest frontend -- --template react-ts`
- התקנת Tailwind + הגדרת `tailwind.config.js`
- התקנת ESLint + Prettier
- מבנה תיקיות: `src/pages`, `src/components`, `src/api`, `src/hooks`, `src/types`, `src/store`
- **DoD:** `npm run dev` עולה ומציג דף ריק עם עיצוב Tailwind. ⏱ 2ש'

## F-02 — Routing ושלד ניווט
- התקנת `react-router-dom`
- הגדרת כל הנתיבים: `/`, `/login`, `/register`, `/dashboard`, `/jobs`, `/jobs/:id`, `/resume`, `/matches`, `/recommendations`
- יצירת `Layout` (Navbar + תוכן + Footer)
- **DoD:** מעבר בין כל הנתיבים עובד, כל דף מציג את שמו. ⏱ 3ש'

## F-03 — ספריית קומפוננטות בסיס
בונים כל אחד כקומפוננטה עצמאית עם props מוגדרים ב-TypeScript:
- `Button`, `Input`, `Card`, `Modal`, `Spinner`, `EmptyState`, `ErrorMessage`
- **DoD:** יש דף `/playground` שמציג את כולן. ⏱ 4ש'

## F-04 — קומפוננטות דומיין
- `Navbar` — לוגו, קישורים, אווטאר משתמש, כפתור התנתקות
- `JobCard` — כותרת, חברה, מיקום, תגיות skills, ציון התאמה
- `SearchBar` — שדה חיפוש + כפתור
- `Filters` — מיקום, סוג משרה, רמת ניסיון, טווח ציון התאמה
- `SkillBadge` — תגית עם צבע לפי מצב (יש / חסר / מומלץ)
- `MatchScoreCard` — עיגול אחוזים + פירוט
- `ResumeUpload` — Drag & Drop + בחירת קובץ + הצגת שם הקובץ
- **DoD:** כל קומפוננטה מוצגת ב-playground עם mock data. ⏱ 8ש'

## F-05 — API Client
- יצירת `src/api/client.ts` עם Axios ו-`baseURL` מ-`.env`
- Interceptor שמוסיף `Authorization: Bearer <token>` לכל בקשה
- Interceptor שתופס 401 → ניקוי token → הפניה ל-login
- טיפוסי TypeScript לכל תשובה מהשרת ב-`src/types/api.ts`
- **DoD:** קריאה ל-`/health` של ה-backend מחזירה תשובה. ⏱ 3ש'

## F-06 — ניהול State
- התקנת TanStack Query + הגדרת `QueryClientProvider`
- `AuthContext` — user, token, login(), logout()
- שמירת token ב-`localStorage` + טעינה מחדש ברענון דף
- `ProtectedRoute` — חוסם דפים למי שלא מחובר
- **DoD:** רענון דף לא מנתק את המשתמש; דף מוגן מפנה ל-login. ⏱ 4ש'

## F-07 — מסכי Auth
- `Login` — אימייל, סיסמה, ולידציה, הודעת שגיאה
- `Register` — שם, אימייל, סיסמה, אימות סיסמה
- אחרי הצלחה → שמירת token → מעבר ל-dashboard
- **DoD:** הרשמה והתחברות אמיתיות מול ה-backend עובדות. ⏱ 5ש'

## F-08 — מסך Dashboard
- כרטיסי סיכום: מספר משרות מותאמות, סטטוס CV, ממוצע ציון התאמה
- רשימת 5 ההתאמות הטובות ביותר
- קיצור דרך להעלאת CV אם אין
- **DoD:** הנתונים נטענים מה-API ולא hardcoded. ⏱ 5ש'

## F-09 — מסכי משרות
- `JobsSearch` — SearchBar + Filters + רשימת `JobCard` + Pagination
- שמירת פילטרים ב-URL query params (כדי שניתן יהיה לשתף קישור)
- `JobDetails` — תיאור מלא, דרישות, skills, ציון התאמה, כפתור הגשה
- **DoD:** חיפוש, פילטור ומעבר עמודים עובדים מול API אמיתי. ⏱ 8ש'

## F-10 — מסך העלאת CV
- בחירת קובץ + ולידציה בצד לקוח (PDF בלבד, עד 5MB)
- הצגת progress bar בזמן העלאה
- Polling ל-`/resume/status` עד שהעיבוד מסתיים
- הצגת ה-skills שחולצו מה-CV
- **DoD:** העלאת PDF אמיתי מציגה בסוף רשימת skills. ⏱ 6ש'

## F-11 — מסכי התאמות והמלצות
- `MatchingResults` — טבלה/רשימה של משרות עם ציון, מיון לפי ציון
- הצגת "כישורים חסרים" לכל משרה
- `Recommendations` — רשימת skills מומלצים ללמידה + הסבר למה
- **DoD:** שני המסכים מציגים נתונים אמיתיים מה-backend. ⏱ 6ש'

## F-12 — טיפול בשגיאות ו-Loading
- Skeleton loaders לכל רשימה
- Toast להודעות הצלחה/שגיאה
- `ErrorBoundary` גלובלי
- מסך 404
- **DoD:** כיבוי ה-backend → האתר מציג שגיאות ידידותיות ולא נשבר. ⏱ 4ש'

## F-13 — רספונסיביות ונגישות
- בדיקה ב-3 רוחבים: מובייל, טאבלט, דסקטופ
- ניווט מקלדת + `aria-label` לכפתורי אייקון
- **DoD:** כל המסכים שמישים במובייל. ⏱ 4ש'

---

# חלק ב' — Backend (FastAPI + Python)

**מה בונים:** ה-API שמחזיק את כל הלוגיקה, מדבר עם ה-DB ומזין את ה-AI Worker.

## B-01 — הקמת פרויקט
- `venv` + `requirements.txt` (fastapi, uvicorn, sqlalchemy, alembic, psycopg2-binary, pydantic-settings, python-jose, passlib[bcrypt], python-multipart)
- מבנה תיקיות:
```
backend/
├── app/
│   ├── routers/       # שכבת HTTP בלבד
│   ├── services/      # לוגיקה עסקית
│   ├── repositories/  # גישה ל-DB
│   ├── models/        # SQLAlchemy
│   ├── schemas/       # Pydantic
│   ├── core/          # config, security, deps
│   └── main.py
└── tests/
```
- **DoD:** `uvicorn app.main:app` רץ ו-`/docs` נפתח. ⏱ 3ש'

## B-02 — Config ו-Health
- `Settings` עם pydantic-settings שקורא מ-`.env` (DB_URL, JWT_SECRET, REDIS_URL, RABBITMQ_URL)
- `GET /health` שמחזיר סטטוס + חיבור DB
- הגדרת CORS ל-origin של ה-frontend
- **DoD:** `/health` מחזיר 200; ה-frontend מצליח לקרוא בלי שגיאת CORS. ⏱ 2ש'

## B-03 — Security utilities
- `hash_password` / `verify_password` עם bcrypt
- `create_access_token` / `decode_token` עם JWT (תוקף 60 דקות)
- Dependency `get_current_user` שמפענח token ומחזיר משתמש
- **DoD:** יוניט-טסטים עוברים על hash + encode/decode. ⏱ 3ש'

## B-04 — Auth API
- `POST /auth/register` — ולידציה שאימייל לא קיים, hash לסיסמה, יצירת משתמש
- `POST /auth/login` — אימות + החזרת token
- `GET /users/me` — פרטי המשתמש המחובר
- קודי שגיאה נכונים: 400 / 401 / 409
- **DoD:** כל השלושה עובדים ב-Swagger מקצה לקצה. ⏱ 5ש'

## B-05 — User & Skills API
- `PUT /users/me` — עדכון שם, כותרת מקצועית, מיקום, שנות ניסיון
- `GET /users/me/skills` — כישורי המשתמש
- `POST /users/me/skills` / `DELETE /users/me/skills/{id}` — הוספה וניתוק ידני
- **DoD:** משתמש יכול לערוך פרופיל ולנהל skills. ⏱ 4ש'

## B-06 — Jobs API
- `GET /jobs` — עם פרמטרים: `q`, `location`, `job_type`, `seniority`, `skills`, `page`, `page_size`
- מיון: לפי תאריך או לפי ציון התאמה (אם יש CV)
- `GET /jobs/{id}` — משרה בודדת + skills + חברה
- תשובה בפורמט אחיד: `{items, total, page, pages}`
- **DoD:** חיפוש עם 3 פילטרים במקביל מחזיר תוצאות נכונות. ⏱ 6ש'

## B-07 — Resume API
- `POST /resume/upload` — קבלת קובץ, ולידציה (PDF/DOCX, ≤5MB, בדיקת magic bytes), שמירה בדיסק/אחסון, יצירת רשומה בסטטוס `pending`, שליחת הודעה ל-RabbitMQ
- `GET /resume/status` — pending / processing / done / failed
- `GET /resume/analysis` — ה-skills והנתונים שחולצו
- **DoD:** העלאת קובץ יוצרת רשומה בסטטוס pending ומודעה בתור. ⏱ 6ש'

## B-08 — Matching Service
- פונקציה `calculate_match(user_skills, job_skills)` שמחזירה:
  - `score` (0–100)
  - `matched_skills`
  - `missing_skills`
- נוסחת בסיס: משקל לכל skill לפי חשיבות (required = 2, nice-to-have = 1)
- `POST /matching/run` — מחשב מול כל המשרות ושומר תוצאות
- `GET /matching/results` — התוצאות השמורות, ממוינות
- **DoD:** משתמש עם CV מקבל רשימת משרות עם ציונים שנשמרים ב-DB. ⏱ 8ש'

## B-09 — Recommendations
- ניתוח פערים: אילו skills מופיעים הכי הרבה במשרות שבהן הציון בינוני
- `GET /recommendations` — רשימת skills מומלצים + כמה משרות ייפתחו בזכות כל אחד
- **DoD:** ההמלצות משתנות בהתאם ל-CV של המשתמש. ⏱ 5ש'

## B-10 — Ingest API לסקרייפרים
- `POST /internal/jobs/bulk` — קליטת משרות מהסקרייפר (מוגן ב-API key)
- Upsert לפי `source + external_id` כדי למנוע כפילויות
- **DoD:** שליחת 100 משרות פעמיים לא יוצרת כפילויות. ⏱ 4ש'

## B-11 — טיפול בשגיאות ולוגים
- Exception handlers גלובליים → פורמט שגיאה אחיד `{error, message, detail}`
- Logging מובנה (JSON) עם `request_id`
- **DoD:** כל שגיאה בשרת מחזירה JSON תקין ומופיעה בלוג. ⏱ 3ש'

## B-12 — בדיקות
- pytest + `TestClient` + DB בדיקות נפרד
- כיסוי: auth, jobs search, matching
- **DoD:** `pytest` ירוק, לפחות 15 טסטים. ⏱ 6ש'

---

# חלק ג' — Database (PostgreSQL)

**מה בונים:** הסכמה שמחזיקה משתמשים, משרות, כישורים ותוצאות.

## D-01 — הרמת DB
- PostgreSQL דרך Docker (`docker run postgres:16`)
- יצירת DB `smartjob` + משתמש ייעודי
- חיבור SQLAlchemy engine + session
- **DoD:** ה-backend מתחבר בהצלחה. ⏱ 2ש'

## D-02 — טבלאות ליבה
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
- **DoD:** הטבלאות קיימות עם מפתחות זרים. ⏱ 3ש'

## D-03 — טבלאות קשר וניתוח
```
resumes(id, user_id FK, file_path, original_name, status,
        error_message, uploaded_at, processed_at)

ai_analysis(id, resume_id FK, raw_text, extracted_json,
            years_experience, created_at)

user_skills(user_id FK, skill_id FK, level, source)   -- PK משולב
job_skills(job_id FK, skill_id FK, importance)        -- PK משולב

matching_results(id, user_id FK, job_id FK, score,
                 matched_skills[], missing_skills[], calculated_at)
                 -- UNIQUE(user_id, job_id)

recommendations(id, user_id FK, skill_id FK, reason,
                potential_jobs_count, created_at)
```
- **DoD:** אפשר להכניס משתמש → CV → ניתוח → התאמה בשרשרת. ⏱ 4ש'

## D-04 — SQLAlchemy Models
- מודל לכל טבלה + `relationship()` דו-כיווני
- `cascade="all, delete-orphan"` איפה שצריך
- **DoD:** שאילתה `user.skills` מחזירה אובייקטים. ⏱ 4ש'

## D-05 — Alembic
- `alembic init` + הגדרת `env.py` לקרוא מה-Settings
- Migration ראשונה שיוצרת הכל
- **DoD:** `alembic upgrade head` על DB ריק בונה את כל הסכמה. ⏱ 3ש'

## D-06 — אינדקסים וביצועים
- אינדקסים: `jobs(posted_at)`, `jobs(location)`, `matching_results(user_id, score DESC)`, `user_skills(user_id)`
- Full-text search על `jobs.title + description` (GIN + tsvector)
- **DoD:** `EXPLAIN ANALYZE` על חיפוש משרות לא עושה Seq Scan. ⏱ 4ש'

## D-07 — Seed Data
- סקריפט שמכניס ~50 משרות, 100 skills ו-2 משתמשי דמו
- **DoD:** מריצים פקודה אחת ויש מערכת מלאה לפיתוח. ⏱ 3ש'

---

# חלק ד' — AI / NLP

**מה בונים:** צינור שהופך קובץ PDF לרשימת כישורים מנורמלת.

## AI-01 — חילוץ טקסט
- קריאת PDF עם `pdfplumber`, קריאת DOCX עם `python-docx`
- ניקוי: הסרת כפילויות שורות, תיקון מקפים בסוף שורה, איחוד רווחים
- טיפול במקרה קצה: PDF סרוק ללא טקסט → החזרת שגיאה ברורה
- **DoD:** 5 קבצי CV שונים מחזירים טקסט קריא. ⏱ 5ש'

## AI-02 — זיהוי מבנה ה-CV
- חלוקה לסקשנים לפי כותרות: Experience / Education / Skills / Projects
- חילוץ טווחי תאריכים לחישוב שנות ניסיון
- **DoD:** מוחזר JSON עם סקשנים נפרדים. ⏱ 5ש'

## AI-03 — מילון Skills
- בניית קובץ `skills.json`: שם קנוני + מילים נרדפות
  (למשל `Kubernetes` ← `k8s`, `kube`, `container orchestration`)
- לפחות 300 כישורים בתחומי פיתוח/DevOps/Data
- **DoD:** המילון נטען ל-DB דרך סקריפט. ⏱ 5ש'

## AI-04 — חילוץ Skills (שלב 1 — התאמה מדויקת)
- התאמה מבוססת מילון עם `spaCy` PhraseMatcher
- נורמליזציה: `React.js` → `React`
- **DoD:** CV לדוגמה מחזיר לפחות 80% מהכישורים שמופיעים בו מפורשות. ⏱ 6ש'

## AI-05 — חילוץ Skills (שלב 2 — סמנטי)
- Embeddings עם `sentence-transformers` (`all-MiniLM-L6-v2`)
- השוואת משפטים מה-CV מול תיאורי skills, סף דמיון ~0.6
- זה מה שמאפשר: "ניסיון בתזמור קונטיינרים" → Kubernetes, Docker
- **DoD:** לפחות 3 כישורים משתמעים מזוהים בקובץ בדיקה. ⏱ 8ש'

## AI-06 — חילוץ Skills ממשרות
- אותו pipeline מופעל על `job.description`
- סיווג `importance`: אם מופיע תחת "Requirements" → required, תחת "Nice to have" → optional
- **DoD:** משרה שנקלטה מקבלת אוטומטית שורות ב-`job_skills`. ⏱ 5ש'

## AI-07 — כיול אלגוריתם ההתאמה
- בדיקה ידנית על 10 זוגות CV/משרה — האם הציון הגיוני?
- כוונון משקלים וסף הדמיון
- **DoD:** מסמך קצר עם 10 דוגמאות והציון שהתקבל. ⏱ 4ש'

---

# חלק ה' — Scraping

**מה בונים:** איסוף משרות אמיתיות לתוך ה-DB.

## S-01 — תשתית סקרייפר
- פרויקט נפרד + מודל נתונים אחיד `JobDTO`
- הגדרות: rate limit, User-Agent, retry עם backoff
- **DoD:** ריצה יבשה מדפיסה JSON תקין. ⏱ 4ש'

## S-02 — סקרייפר ראשון
- מקור אחד בלבד (הקל ביותר טכנית) — רשימה + עמוד משרה
- חילוץ: כותרת, חברה, מיקום, תיאור, תאריך, קישור, מזהה חיצוני
- **DoD:** 50 משרות אמיתיות נאספות. ⏱ 8ש'

## S-03 — סקרייפרים נוספים
- שני מקורות נוספים לפי אותה ממשק
- **DoD:** כל סקרייפר מחזיר את אותו `JobDTO`. ⏱ 10ש'

## S-04 — ניקוי ונרמול
- הסרת כפילויות: אותו `title + company + location` → אחד
- נרמול תארי משרה (`Sr. SWE` → `Senior Software Engineer`)
- נרמול מיקומים
- **DoD:** מתוך 300 משרות גולמיות נשמרות ~250 ייחודיות. ⏱ 6ש'

## S-05 — טעינה ל-Backend
- שליחה ל-`POST /internal/jobs/bulk` בבאצ'ים של 50
- לוג של: נוספו / עודכנו / נכשלו
- **DoD:** הרצה מלאה מסתיימת עם סיכום מספרי. ⏱ 4ש'

## S-06 — תזמון
- CronJob (ב-K8s) או scheduler שרץ פעם ביום
- **DoD:** ריצה אוטומטית מוכחת פעמיים ברצף. ⏱ 3ש'

---

# חלק ו' — Redis

**מה בונים:** שכבת cache שמזרזת את החיפושים.

## R-01 — התקנה וחיבור
- Redis ב-docker-compose + `redis-py` async ב-backend
- **DoD:** `PING` מהקוד מחזיר `PONG`. ⏱ 2ש'

## R-02 — Cache לחיפוש משרות
- מפתח = hash של כל פרמטרי החיפוש, TTL 5 דקות
- Invalidation אחרי טעינת משרות חדשות
- **DoD:** קריאה שנייה לאותו חיפוש מהירה משמעותית (למדוד ולתעד). ⏱ 4ש'

## R-03 — Cache לתוצאות התאמה + Rate Limiting
- שמירת `matching_results` של משתמש ל-10 דקות
- הגבלת קצב על `/auth/login` ועל העלאת CV
- **DoD:** ניסיון 11 התחברויות בדקה מוחזר 429. ⏱ 4ש'

---

# חלק ז' — RabbitMQ + AI Worker

**מה בונים:** עיבוד CV ברקע, כדי שהמשתמש לא ימתין.

## Q-01 — התקנה ותורים
- RabbitMQ + management UI ב-docker-compose
- הגדרת exchange + queue `cv.process` + `cv.process.dlq` (Dead Letter)
- **DoD:** ניתן לראות את התורים ב-UI בפורט 15672. ⏱ 3ש'

## Q-02 — Producer בצד ה-Backend
- אחרי העלאת CV נשלחת הודעה: `{resume_id, user_id, file_path}`
- הודעות persistent + publisher confirms
- **DoD:** ההודעה נראית בתור אחרי העלאה. ⏱ 3ש'

## W-01 — שלד ה-Worker
- שירות Python נפרד עם consumer, `prefetch_count=1`
- ack רק אחרי הצלחה; כישלון → nack ל-DLQ
- **DoD:** Worker מקבל הודעה ומדפיס אותה. ⏱ 4ש'

## W-02 — צינור העיבוד
```
קבלת הודעה
  ↓ עדכון status = processing
  ↓ חילוץ טקסט (AI-01)
  ↓ ניתוח מבנה (AI-02)
  ↓ חילוץ skills (AI-04, AI-05)
  ↓ שמירה ל-ai_analysis + user_skills
  ↓ חישוב התאמות (B-08)
  ↓ עדכון status = done
```
- טיפול בשגיאה: `status = failed` + הודעת שגיאה
- **DoD:** העלאת CV מה-UI מסתיימת תוך פחות מדקה עם skills מוצגים. ⏱ 8ש'

## W-03 — עמידות
- Retry עד 3 פעמים עם השהיה
- Idempotency: עיבוד חוזר של אותו `resume_id` לא יוצר כפילויות
- **DoD:** הפלת Worker באמצע עיבוד → ההודעה מעובדת שוב בהצלחה. ⏱ 5ש'

---

# חלק ח' — Docker

## DK-01 — Dockerfile ל-Backend
- Multi-stage, base `python:3.12-slim`, משתמש non-root
- `HEALTHCHECK` על `/health`
- **DoD:** התמונה עולה ומשרתת בקשות. ⏱ 3ש'

## DK-02 — Dockerfile ל-Frontend
- שלב build (node) + שלב הגשה (nginx)
- קונפיג nginx שתומך ב-SPA routing
- **DoD:** רענון ב-`/jobs/5` לא מחזיר 404. ⏱ 3ש'

## DK-03 — Dockerfile ל-Worker
- כולל הורדת מודל ה-embeddings בזמן build (לא בזמן ריצה)
- **DoD:** Worker עולה ומתחבר ל-RabbitMQ. ⏱ 3ש'

## DK-04 — docker-compose
- 6 שירותים: frontend, backend, worker, postgres, redis, rabbitmq
- `depends_on` עם `condition: service_healthy`
- Volumes לנתונים, `.env.example` מתועד
- **DoD:** `docker compose up` על מחשב נקי מרים מערכת עובדת מקצה לקצה. ⏱ 5ש'

---

# חלק ט' — Kubernetes

## K-01 — Namespace ותשתית
- `namespace: smartjob`
- ResourceQuota בסיסי
- **DoD:** `kubectl get ns smartjob` עובד. ⏱ 1ש'

## K-02 — Config ו-Secrets
- ConfigMap: כתובות שירותים, רמת לוג
- Secret: סיסמת DB, JWT_SECRET, API keys
- **DoD:** אין אף סוד ב-YAML שנכנס ל-git. ⏱ 3ש'

## K-03 — StatefulSets לתשתית
- PostgreSQL + Redis + RabbitMQ עם PVC
- **DoD:** מחיקת Pod של DB לא מוחקת נתונים. ⏱ 5ש'

## K-04 — Deployments
- backend (2 replicas), frontend (2), worker (1–2)
- לכל אחד: `resources.requests/limits`, `livenessProbe`, `readinessProbe`
- **DoD:** כל ה-Pods במצב Running/Ready. ⏱ 5ש'

## K-05 — Services ו-Ingress
- ClusterIP לכל שירות
- Ingress: `/` → frontend, `/api` → backend
- TLS (cert-manager או self-signed לדמו)
- **DoD:** גישה למערכת דרך כתובת אחת. ⏱ 4ש'

## K-06 — Scaling
- HPA לפי CPU על ה-backend (2→5)
- **DoD:** מבחן עומס מדגים הוספת Pod. ⏱ 3ש'

---

# חלק י' — CI/CD (GitHub Actions)

## CI-01 — Pipeline של PR
```
lint → unit tests → build → security scan
```
- מריץ: ruff/eslint, pytest, npm test
- **DoD:** PR עם קוד שבור נחסם ממיזוג. ⏱ 5ש'

## CI-02 — Build & Push
- בניית תמונות ל-3 השירותים
- תיוג: `sha-<commit>` + `latest`
- דחיפה ל-GHCR
- **DoD:** מיזוג ל-main יוצר תמונה חדשה ב-registry. ⏱ 4ש'

## CI-03 — Deploy
- עדכון ה-tag במניפסטים והרצת `kubectl apply`
- אישור ידני לפני production
- **DoD:** deploy מלא אוטומטי מ-push ועד Pods חדשים. ⏱ 5ש'

## CI-04 — Rollback
- `kubectl rollout undo` כ-workflow ידני
- **DoD:** חזרה לגרסה קודמת בלחיצה אחת. ⏱ 2ש'

---

# חלק י"א — Security (הלב של הפרויקט)

## SEC-01 — SAST
- SonarQube או CodeQL בכל PR
- **DoD:** דוח ראשון + תיקון כל ה-Critical. ⏱ 4ש'

## SEC-02 — Dependencies
- Dependabot + `pip-audit` / `npm audit` ב-pipeline
- **DoD:** Build נכשל על פגיעות High. ⏱ 3ש'

## SEC-03 — סריקת תמונות
- Trivy על כל תמונה אחרי build
- **DoD:** דוח נקי מ-Critical, או חריגות מתועדות. ⏱ 3ש'

## SEC-04 — סודות
- gitleaks בכל commit
- **DoD:** ניסיון לדחוף מפתח נחסם. ⏱ 2ש'

## SEC-05 — אבטחת אפליקציה
- ולידציית קלט בכל endpoint (Pydantic)
- הגנה על העלאת קבצים: סוג, גודל, magic bytes, שם קובץ מנוקה, שמירה מחוץ ל-webroot
- Security headers + CORS מצומצם
- הרשאות: משתמש רואה רק את הנתונים שלו
- **DoD:** צ'קליסט OWASP Top 10 מלא עם תשובה לכל סעיף. ⏱ 8ש'

## SEC-06 — אבטחת K8s
- Pods לא-root, `readOnlyRootFilesystem`, NetworkPolicies
- **DoD:** אף Pod לא רץ כ-root. ⏱ 4ש'

---

# חלק י"ב — Monitoring

## MON-01 — Metrics
- `prometheus-fastapi-instrumentator` בבקאנד
- מדדים מותאמים: זמן עיבוד CV, אורך תור, מספר התאמות שחושבו
- **DoD:** `/metrics` מחזיר נתונים ו-Prometheus אוסף אותם. ⏱ 4ש'

## MON-02 — Grafana
- דשבורד 1: בריאות API (RPS, latency, error rate)
- דשבורד 2: תשתית (CPU, זיכרון, Pods)
- דשבורד 3: עסקי (העלאות CV, אורך תור, זמן עיבוד ממוצע)
- **DoD:** 3 דשבורדים שמורים כ-JSON ב-repo. ⏱ 5ש'

## MON-03 — Logging
- Fluent Bit → Loki, לוגים בפורמט JSON
- **DoD:** חיפוש לפי `request_id` מחזיר את כל שרשרת הבקשה. ⏱ 4ש'

## MON-04 — Alerts
- התראות: error rate > 5%, תור CV > 50, Pod נופל שוב ושוב, דיסק > 80%
- **DoD:** התראה אחת הופעלה בכוונה והתקבלה. ⏱ 3ש'

---

# לוח ספרינטים (סדר ביצוע לפי תלויות)

| ספרינט | מטרה | משימות | הישג בסוף הספרינט |
|---|---|---|---|
| 0 | תשתית | repo, branches, F-01, B-01, D-01 | כולם רצים לוקאלית |
| 1 | שלד | B-02, D-02, D-03, D-04, D-05, F-02, F-03 | DB + API + ניווט |
| 2 | Auth | B-03, B-04, B-05, F-05, F-06, F-07 | הרשמה והתחברות עובדות |
| 3 | משרות | D-06, D-07, B-06, F-04, F-08, F-09 | חיפוש משרות מלא |
| 4 | Scraping | S-01, S-02, S-04, S-05, B-10 | משרות אמיתיות ב-DB |
| 5 | CV + תורים | Q-01, Q-02, W-01, B-07, F-10, AI-01, AI-02 | העלאת CV ועיבוד ברקע |
| 6 | AI | AI-03, AI-04, AI-05, AI-06, W-02 | חילוץ skills עובד |
| 7 | Matching | B-08, B-09, W-03, F-11, AI-07 | ציוני התאמה והמלצות |
| 8 | ביצועים | R-01, R-02, R-03, B-11, B-12, F-12, F-13 | מערכת יציבה ומהירה |
| 9 | Containers | DK-01…DK-04, S-03, S-06 | הכל רץ ב-compose |
| 10 | K8s | K-01…K-06 | deploy באשכול |
| 11 | CI/CD | CI-01…CI-04 | pipeline מלא |
| 12 | Security | SEC-01…SEC-06 | דוח אבטחה |
| 13 | Monitoring + הגשה | MON-01…MON-04, תיעוד, הדגמה | פרויקט מוכן |

**הערה חשובה:** אל תחכו לספרינט 9 בשביל Docker. מומלץ לכתוב `docker-compose` בסיסי כבר בספרינט 0 (רק postgres + redis + rabbitmq) כדי שכולם יעבדו על אותה סביבה.

---

# חלוקת עבודה

| | Developer 1 — Backend | Developer 2 — Frontend | Developer 3 — Platform / AI |
|---|---|---|---|
| **בבעלות** | B-01…B-12, D-01…D-07 | F-01…F-13 | AI, S, Q, W, DK, K, CI, SEC, MON |
| **ספרינטים 0–3** | סכמה + Auth + Jobs API | שלד + קומפוננטות + מסכים | סקרייפר + compose לתשתית |
| **ספרינטים 4–7** | Matching + Recommendations | CV + התאמות + המלצות | NLP + Worker |
| **ספרינטים 8–13** | ביצועים + טסטים | ליטוש + נגישות | K8s + CI/CD + Security + Monitoring |

**נקודות ממשק שחייבות סנכרון מוקדם:**
1. חוזה ה-API (schemas) — לסגור בספרינט 1 לפני שכל אחד בונה לבד.
2. פורמט `JobDTO` בין הסקרייפר ל-backend — לסגור בספרינט 4.
3. פורמט התוצאה של ה-Worker (מה נכתב ל-`ai_analysis`) — לסגור בספרינט 5.

---

# סיכום מספרי

| תחום | משימות | שעות משוערות |
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
| **סה"כ** | **77** | **~337 שעות** |

~337 שעות ÷ 3 אנשים ≈ **112 שעות לאדם**. בקצב של 10 שעות שבועיות — כ-11 שבועות.
