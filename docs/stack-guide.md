# מדריך הכלים — Frontend & Backend

מסמך הסבר לכל כלי ב־Stack: **מה זה, איזו בעיה הוא פותר, איך זה נראה בקוד, ואיפה בדיוק הוא משמש בפרויקט שלנו.**

---

# חלק א' — Frontend

## התמונה הכללית

```
המשתמש רואה דף
   ↓
React  ← בונה את מה שרואים על המסך
   ↓
TypeScript  ← מוודא שאין טעויות בקוד לפני שהוא רץ
   ↓
Tailwind  ← נותן לזה עיצוב
   ↓
Axios  ← שולח בקשות לשרת
   ↓
TanStack Query  ← מנהל את התשובות: cache, loading, שגיאות
```

חמישה כלים, כל אחד עם תפקיד אחד ברור. הם לא חופפים.

---

## 1. React

### מה זה
ספרייה לבניית ממשקי משתמש. במקום לכתוב HTML סטטי ולעדכן אותו ידנית ב־JavaScript, מתארים **איך המסך צריך להיראות בהינתן נתונים**, ו־React דואג לעדכן את הדף כשהנתונים משתנים.

### הבעיה שהוא פותר
בלי React, כדי להוסיף משרה לרשימה היית צריך לכתוב:
```javascript
const li = document.createElement('li');
li.textContent = job.title;
document.getElementById('jobs-list').appendChild(li);
// ועכשיו לזכור למחוק אותה כשהיא כבר לא רלוונטית...
```
בפרויקט עם 8 מסכים זה הופך לבלגן שאי אפשר לתחזק.

עם React אתה פשוט אומר "הרשימה צריכה להציג את המערך הזה":
```jsx
{jobs.map(job => <JobCard key={job.id} job={job} />)}
```
המערך השתנה? המסך מתעדכן לבד.

### מושגי היסוד שחייבים להכיר

**קומפוננטה** — פונקציה שמחזירה UI. זו יחידת הבנייה הבסיסית.
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

**Props** — נתונים שקומפוננטה מקבלת מבחוץ (כמו פרמטרים לפונקציה). ב־דוגמה למעלה `job` הוא prop.

**State** — נתונים שהקומפוננטה מחזיקה בעצמה ויכולים להשתנות. כשהם משתנים, הקומפוננטה מציירת את עצמה מחדש.
```jsx
const [searchText, setSearchText] = useState("");
// searchText = הערך הנוכחי
// setSearchText = הפונקציה שמשנה אותו
```

**useEffect** — קוד שרץ אחרי שהקומפוננטה מוצגת, או כשמשהו משתנה. משמש לדברים "מחוץ ל־React" (טיימרים, מאזינים). **הערה חשובה:** לא נשתמש בו לקריאות API — בשביל זה יש TanStack Query.

### בפרויקט שלנו
כל מסך הוא קומפוננטה: `JobsSearch`, `Dashboard`, `ResumeUpload`. בתוכם קומפוננטות קטנות יותר: `JobCard`, `SkillBadge`, `MatchScoreCard`. אותו `JobCard` משמש בדשבורד, בחיפוש ובתוצאות ההתאמה — כותבים פעם אחת, משתמשים בשלושה מקומות.

### למה React ולא Vue/Angular
React הוא הנפוץ ביותר בתעשייה — הכי הרבה חומרי לימוד, הכי הרבה ספריות, והכי רלוונטי לקורות חיים. Angular כבד מדי לפרויקט בגודל הזה.

---

## 2. TypeScript

### מה זה
JavaScript עם **טיפוסים**. אתה מצהיר איזה סוג נתונים כל משתנה מחזיק, והכלי בודק שלא טעית — **לפני** שהקוד רץ.

### הבעיה שהוא פותר
ב־JavaScript רגיל:
```javascript
console.log(job.company.name);
```
אם השרת החזיר `company_name` ולא `company`, תגלה את זה רק כשהדף יקרוס אצל המשתמש.

ב־TypeScript:
```typescript
interface Job {
  id: number;
  title: string;
  company_name: string;
  match_score: number | null;   // יכול להיות null!
  skills: string[];
}

console.log(job.company.name);
// ❌ שגיאה אדומה בעורך, לפני הרצה:
// Property 'company' does not exist on type 'Job'
```

### התועלת הגדולה ביותר — Autocomplete
כשאתה מגדיר את הטיפוס פעם אחת, העורך יודע להשלים לך שמות שדות בכל מקום בפרויקט. במקום לחזור לתיעוד ה־API בכל פעם, אתה מקליד `job.` ורואה את כל האפשרויות.

### בפרויקט שלנו
נגדיר טיפוס לכל תשובה מה־backend בקובץ `src/types/api.ts`:
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
זה גם משמש כתיעוד חי של חוזה ה־API — כל מי שקורא את הקובץ יודע בדיוק מה השרת מחזיר.

### טיפ מעשי
תתחיל בלי `any`. הפיתוי להשתמש ב־`any` כשמשהו לא עובד גדול, אבל זה מבטל את כל התועלת.

---

## 3. Tailwind CSS

### מה זה
ספריית CSS שבה מעצבים דרך **מחלקות קטנות** שכתובות ישירות ב־HTML, במקום לכתוב קובצי CSS נפרדים.

### ההשוואה
CSS רגיל:
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

### למה זה עדיף בפרויקט כזה
1. **לא צריך להמציא שמות.** רוב הזמן ב־CSS מבוזבז על "איך אקרא למחלקה הזאת".
2. **אתה רואה את העיצוב במקום שבו הוא חל.** אין קפיצה בין קבצים.
3. **מחיקת קומפוננטה מוחקת גם את העיצוב שלה.** בקובץ CSS גלובלי מצטבר קוד מת שאף אחד לא מעז למחוק.
4. **עקביות מובנית.** `p-4` זה תמיד 16px. אין מצב שמפתח אחד כתב 15px ואחר 17px.

### תחביר שכדאי להכיר
```
p-4      padding: 16px          (המספרים בקפיצות של 4px)
mt-2     margin-top: 8px
flex     display: flex
gap-3    רווח בין ילדים
text-lg  גודל טקסט
font-bold
bg-blue-600 / text-white / border-gray-200
rounded-lg
hover:bg-blue-700     ← מצב hover
md:grid-cols-3        ← רק במסכים בינוניים ומעלה (רספונסיביות)
```

### הביקורת המקובלת
"ה־HTML נהיה מכוער עם 15 מחלקות." זה נכון — והפתרון הוא React: אתה כותב את המחלקות פעם אחת בתוך `JobCard`, ואז משתמש ב־`<JobCard />` בכל מקום. הכיעור מרוכז במקום אחד.

---

## 4. Vite (כלי הבנייה)

לא מופיע בטבלה אבל נחוץ — זה מה שמריץ את הפרויקט.

**מה הוא עושה:** מריץ שרת פיתוח מקומי עם **Hot Module Replacement** — אתה שומר קובץ והדפדפן מתעדכן מיד בלי לרענן ובלי לאבד את מצב הדף. בזמן build הוא אורז את כל הקוד לקבצים סטטיים מוקטנים.

```bash
npm create vite@latest frontend -- --template react-ts
npm run dev     # פיתוח
npm run build   # ייצור → תיקיית dist/
```

---

## 5. Axios

### מה זה
ספרייה לשליחת בקשות HTTP. תחליף נוח ל־`fetch` המובנה בדפדפן.

### למה לא סתם fetch
```javascript
// fetch
const res = await fetch('/api/jobs');
if (!res.ok) throw new Error('failed');   // fetch לא זורק שגיאה על 404/500!
const data = await res.json();

// axios
const { data } = await api.get('/jobs');  // זורק שגיאה לבד, ממיר JSON לבד
```

### היתרון המרכזי — Interceptors
קוד שרץ אוטומטית לפני כל בקשה או אחרי כל תשובה. זה מה שחוסך לנו כתיבה חוזרת בכל קריאה.

```typescript
// src/api/client.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,   // http://localhost:8000
  timeout: 15000,
});

// לפני כל בקשה — הוסף את ה-token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// אחרי כל תשובה — אם ה-token פג, נתק את המשתמש
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

**מה השגנו:** אף קריאת API בפרויקט לא צריכה לדעת שקיים token בכלל. כתבנו את זה פעם אחת.

### בפרויקט שלנו
כל הקריאות עוברות דרך `client.ts`. פונקציות ה־API מרוכזות לפי נושא:
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

### מה זה
ספרייה לניהול **נתונים שמגיעים מהשרת**. זה הכלי שהכי פחות מוכר למי שמתחיל, והכי משנה את איכות הקוד.

### הבעיה שהוא פותר
בלי TanStack Query, כל קריאה לשרת נראית ככה:
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
**14 שורות, ואת אותו הקוד תשכפל ב־8 מסכים.** ועדיין חסר: cache, ביטול בקשה ישנה שחזרה מאוחר, רענון, retry.

### עם TanStack Query
```jsx
const { data, isLoading, error } = useQuery({
  queryKey: ['jobs', filters],
  queryFn: () => jobsApi.search(filters),
});
```
**3 שורות, וכולל את כל מה שחסר למעלה.**

### מה קורה מאחורי הקלעים

**`queryKey`** — תעודת הזהות של הנתון. זה הלב של הספרייה:
- שני מסכים עם אותו key → **בקשה אחת בלבד** לשרת, שניהם מקבלים את התוצאה
- ה־key השתנה (המשתמש שינה פילטר) → בקשה חדשה אוטומטית
- חזרת למסך שכבר ביקרת בו → הנתונים מוצגים **מיד** מה־cache, ורק אז מתרעננים ברקע

**מה עוד מגיע בחינם:**
- Retry אוטומטי על כישלון רשת
- רענון כשחוזרים ללשונית הדפדפן
- מניעת בקשות כפולות בו־זמנית
- `isFetching` נפרד מ־`isLoading` (רענון ברקע לא מהבהב את המסך)

### Mutations — לשינוי נתונים
```jsx
const uploadMutation = useMutation({
  mutationFn: (file: File) => resumeApi.upload(file),
  onSuccess: () => {
    // ה-CV השתנה → תוצאות ההתאמה כבר לא תקפות
    queryClient.invalidateQueries({ queryKey: ['matching'] });
  },
});

<button onClick={() => uploadMutation.mutate(file)}
        disabled={uploadMutation.isPending}>
  {uploadMutation.isPending ? 'מעלה...' : 'העלה CV'}
</button>
```
`invalidateQueries` מסמן נתונים כלא־תקפים, וכל מסך שמשתמש בהם יטען אותם מחדש אוטומטית.

### שימוש מיוחד אצלנו — Polling
עיבוד ה־CV לוקח זמן ורץ ברקע. TanStack Query יודע לשאול את השרת שוב ושוב עד שזה נגמר:
```jsx
const { data: status } = useQuery({
  queryKey: ['resume-status'],
  queryFn: resumeApi.getStatus,
  refetchInterval: (query) =>
    query.state.data?.status === 'done' ? false : 3000,
  // שואל כל 3 שניות, מפסיק כשהסתיים
});
```

### חשוב להבין: זה לא Redux
| | TanStack Query | Redux / Zustand |
|---|---|---|
| **בשביל מה** | נתונים מהשרת | מצב מקומי של האפליקציה |
| **דוגמה** | רשימת משרות, תוצאות התאמה | האם ה־sidebar פתוח, טופס בעריכה |

בפרויקט שלנו כמעט הכל הוא נתוני שרת, ולכן **לא נצטרך Redux בכלל**. למי שמחובר נשתמש ב־Context פשוט.

---

## איך זה נראה יחד — מסך אמיתי

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

**כל כלי ותפקידו בקוד הזה:**
- **React** — הקומפוננטה והציור מחדש כש־`filters` משתנה
- **TypeScript** — `JobSearchParams` ו־`data.items` מוגדרים ומאומתים
- **Tailwind** — `max-w-5xl mx-auto p-6 grid gap-4 md:grid-cols-2`
- **Axios** — בתוך `jobsApi.search`, מוסיף את ה־token
- **TanStack Query** — `useQuery`, ה־cache, ה־loading וה־error

---
---

# חלק ב' — Backend

## התמונה הכללית

```
בקשה מה-Frontend
   ↓
FastAPI  ← מקבל, מאמת קלט, מנתב
   ↓
Pydantic  ← בודק שהנתונים תקינים
   ↓
Redis  ← יש תשובה שמורה? החזר מיד
   ↓
SQLAlchemy  ← תרגום בין Python ל-SQL
   ↓
PostgreSQL  ← הנתונים עצמם
   
במקביל, לתהליכים כבדים:
RabbitMQ → AI Worker → pdfplumber → spaCy → Sentence Transformers
```

---

## 7. Python + FastAPI

### למה Python לפרויקט הזה
כל עולם ה־NLP וה־AI כתוב ב־Python. spaCy, Sentence Transformers, pdfplumber — כולם ספריות Python. אם היינו בוחרים Node.js ל־backend, היינו צריכים שירות Python נפרד רק בשביל ה־AI. Python מאפשר לנו לכתוב הכל בשפה אחת.

### מה זה FastAPI
Framework לבניית REST APIs. שלושה דברים מייחדים אותו:

**א. ולידציה אוטומטית מטיפוסים**
```python
@router.get("/jobs/{job_id}")
def get_job(job_id: int):
    ...
```
מישהו שלח `/jobs/abc`? FastAPI מחזיר 422 עם הודעת שגיאה ברורה, בלי שכתבת שורת בדיקה אחת.

**ב. תיעוד אינטראקטיבי חינם**
כל endpoint שאתה כותב מופיע אוטומטית ב־`http://localhost:8000/docs` — עם טופס שאפשר להריץ ממנו בקשות אמיתיות. **זה כלי הפיתוח הכי שימושי שיהיה לך.** ה־frontend developer יכול לראות בדיוק מה ה־API מחזיר בלי לשאול אותך.

**ג. Async מובנה**
```python
async def search_jobs(...):
    cached = await redis.get(key)      # בזמן ההמתנה,
    rows = await db.execute(query)     # השרת מטפל בבקשות אחרות
```
חשוב אצלנו כי הרבה זמן מבוזבז בהמתנה ל־DB, ל־Redis ולתור.

### מושג המפתח — Dependency Injection
זו התכונה שהכי משנה את מבנה הקוד ב־FastAPI. במקום שכל endpoint יטפל בעצמו באימות ובחיבור ל־DB:

```python
# מגדירים פעם אחת
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    payload = decode_token(token)
    user = db.query(User).get(payload["sub"])
    if not user:
        raise HTTPException(401, "Invalid credentials")
    return user

# ומשתמשים בכל מקום
@router.get("/users/me")
def me(user: User = Depends(get_current_user)):
    return user          # אם הגענו לכאן — המשתמש מאומת. נקודה.
```

השורה `user: User = Depends(get_current_user)` מבטיחה גם אימות, גם קבלת המשתמש, וגם שהיא מופיעה בתיעוד כ־endpoint מוגן.

### מבנה השכבות שנעבוד לפיו
```
routers/      HTTP בלבד — מקבל בקשה, מחזיר תשובה. אין כאן לוגיקה.
services/     הלוגיקה העסקית — "איך מחשבים ציון התאמה"
repositories/ גישה ל-DB — שאילתות בלבד
models/       טבלאות (SQLAlchemy)
schemas/      חוזה הקלט/פלט (Pydantic)
```

**למה זה חשוב:** את `calculate_match()` אפשר לבדוק ביוניט־טסט בלי להרים שרת ובלי DB. ובנוסף — ה־AI Worker, שהוא תהליך נפרד לגמרי, קורא לאותו service. אם הלוגיקה הייתה בתוך ה־router, היינו צריכים לשכפל אותה.

---

## 8. Pydantic

מגיע יחד עם FastAPI ואחראי על **חוזה הנתונים**.

```python
# schemas/job.py
from pydantic import BaseModel, Field

class JobOut(BaseModel):
    id: int
    title: str
    company_name: str
    match_score: float | None = None
    skills: list[str]

    model_config = {"from_attributes": True}   # ממיר אובייקט SQLAlchemy

class JobSearchParams(BaseModel):
    q: str | None = None
    location: str | None = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)   # לא יאפשר 10000
```

**שלוש תועלות:**
1. **ולידציית קלט** — הגנה מפני נתונים זדוניים או שגויים (זה גם סעיף אבטחה!)
2. **סינון פלט** — אם `JobOut` לא כולל `password_hash`, הוא לא ידלוף החוצה גם אם הוא קיים במודל
3. **מסמך ה־API** — ה־schemas האלה הם בדיוק מה שיופיע ב־`/docs` ומה שה־frontend יתרגם ל־TypeScript interfaces

---

## 9. PostgreSQL

### מה זה
מסד נתונים רלציוני — נתונים בטבלאות עם קשרים ביניהן.

### למה רלציוני ולא MongoDB
כי הנתונים שלנו הם **בעיקרם קשרים**:
```
משתמש  ←→ כישורים  (רבים לרבים)
משרה   ←→ כישורים  (רבים לרבים)
משתמש  ←→ משרה     דרך תוצאת התאמה
```
השאלה המרכזית של המערכת היא "אילו משרות דורשות כישורים שיש למשתמש הזה" — זו שאילתת JOIN קלאסית. ב־MongoDB היינו נלחמים בזה.

### יכולות ספציפיות שנשתמש בהן

**Full-Text Search** — חיפוש חופשי בתיאורי משרות, מובנה במסד:
```sql
SELECT * FROM jobs
WHERE to_tsvector('english', title || ' ' || description)
      @@ plainto_tsquery('english', 'kubernetes devops');
```
חוסך לנו להקים Elasticsearch נפרד.

**מערכים** — `missing_skills` נשמר כמערך בעמודה אחת במקום טבלה נוספת.

**JSONB** — פלט ה־AI הגולמי נשמר כ־JSON, וניתן לחפש בתוכו.

**אינדקסים** — בלעדיהם חיפוש על 10,000 משרות יסרוק את כל הטבלה בכל בקשה.

---

## 10. SQLAlchemy (ORM)

### מה זה ORM
Object Relational Mapper — כותבים Python, מקבלים SQL.

```python
# בלי ORM
cursor.execute(
    "SELECT * FROM jobs WHERE location = %s LIMIT %s", (location, 20)
)
rows = cursor.fetchall()
title = rows[0][2]          # ...איזו עמודה זו 2?

# עם ORM
jobs = db.query(Job).filter(Job.location == location).limit(20).all()
title = jobs[0].title       # ברור
```

### הגדרת מודל
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

השורה האחרונה מאפשרת:
```python
job.company.name          # SQLAlchemy מבצע את ה-JOIN
[s.name for s in job.skills]
```

### היתרון הגדול ביותר — הגנה מפני SQL Injection
```python
# מסוכן — לעולם לא לכתוב כך
db.execute(f"SELECT * FROM users WHERE email = '{email}'")
# email = "' OR '1'='1"  →  הדליף את כל המשתמשים

# ORM — פרמטרים מופרדים מהשאילתה, מוגן אוטומטית
db.query(User).filter(User.email == email).first()
```
זה סעיף ישיר ב־OWASP Top 10 שנצטרך להראות בחלק האבטחה.

### מלכודת שחייבים להכיר — N+1
```python
jobs = db.query(Job).limit(50).all()
for job in jobs:
    print(job.company.name)    # ⚠️ 50 שאילתות נוספות!
```
הפתרון:
```python
jobs = db.query(Job).options(joinedload(Job.company)).limit(50).all()
# שאילתה אחת עם JOIN
```
זו הסיבה הכי נפוצה ל־API איטי. שווה לבדוק את זה כשמגיעים לספרינט הביצועים.

---

## 11. Alembic (Migrations)

### הבעיה
ה־DB כבר רץ עם נתונים אמיתיים, ואתה צריך להוסיף עמודה. מה עושים? למחוק ולבנות מחדש? לרשום פקודות SQL בקובץ ולקוות שכולם יריצו?

### הפתרון
Alembic מייצר **קובץ migration ממוספר** לכל שינוי סכמה, ושומר אותו ב־git לצד הקוד.

```bash
# שינית את המודל ב-Python:
alembic revision --autogenerate -m "add salary columns"
# → נוצר migrations/versions/a1b2c3_add_salary_columns.py

alembic upgrade head    # מחיל את השינוי
alembic downgrade -1    # מבטל אותו
```

```python
def upgrade():
    op.add_column('jobs', sa.Column('salary_min', sa.Integer()))

def downgrade():
    op.drop_column('jobs', 'salary_min')
```

**למה זה קריטי בפרויקט צוותי:** כל מפתח מושך את השינויים מ־git ומריץ `alembic upgrade head` — ו־ה־DB שלו זהה לשל כולם. וב־CI/CD, זו הפקודה שרצה אוטומטית לפני כל deployment.

---

## 12. Redis

### מה זה
מסד נתונים במבנה מפתח־ערך שיושב **בזיכרון** (RAM). קריאה ממנו לוקחת מיליוניות שנייה, לעומת מילישניות מ־PostgreSQL.

### שימוש 1 — Cache לחיפושים
החיפוש "DevOps בתל אביב" רץ עשרות פעמים ביום ומחזיר את אותה תשובה. אין סיבה להריץ אותה שאילתה שוב ושוב.

```python
async def search_jobs(params, db, redis):
    key = f"jobs:{hash_params(params)}"

    cached = await redis.get(key)
    if cached:
        return json.loads(cached)          # ~1ms

    result = await jobs_repo.search(db, params)   # ~150ms
    await redis.setex(key, 300, json.dumps(result))  # שמור ל-5 דקות
    return result
```

**TTL** (Time To Live) הוא המנגנון החשוב: הנתון מוחק את עצמו אחרי 5 דקות, כך שמשרות חדשות יופיעו בלי שנצטרך לנקות ידנית.

### שימוש 2 — Rate Limiting
הגנה מפני ניסיונות פריצה לחשבון:
```python
async def check_rate_limit(ip: str, redis):
    key = f"login_attempts:{ip}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 60)
    if count > 10:
        raise HTTPException(429, "Too many attempts")
```
10 ניסיונות התחברות בדקה — ואז חסימה. סעיף אבטחה שקל להראות בהדגמה.

### שימוש 3 — נתונים זמניים
תוצאות ההתאמה של משתמש, שחישובן יקר, נשמרות ל־10 דקות.

### נקודה חשובה
Redis הוא **בזיכרון** — נפילה מוחקת הכל. לכן: אף פעם לא שומרים בו נתון שאין לו מקור אמת ב־PostgreSQL. הוא שכבת האצה בלבד.

---

## 13. RabbitMQ

### הבעיה שהוא פותר
משתמש מעלה CV. העיבוד — קריאת PDF, ניתוח NLP, חישוב embeddings, השוואה מול כל המשרות — לוקח 30–60 שניות.

בלי תור:
```
POST /resume/upload
  ↓ המשתמש מסתכל על מסך טעינה 60 שניות
  ↓ הדפדפן עלול לנתק את החיבור (timeout)
  ↓ שרת ה-API תפוס ולא מטפל בבקשות אחרות
```

עם תור:
```
POST /resume/upload
  ↓ שמור קובץ, שלח הודעה לתור
  ↓ החזר 202 Accepted תוך 200ms  ✅
  ↓ המשתמש ממשיך לגלוש
      
  [ברקע] Worker לוקח מהתור ומעבד
  ↓ מעדכן status = done
  ↓ ה-Frontend, שעושה polling, מציג את התוצאה
```

### מושגי היסוד
- **Producer** — מי ששולח הודעה (ה־backend)
- **Queue** — התור שמחזיק הודעות ממתינות
- **Consumer** — מי שקורא ומעבד (ה־AI Worker)
- **ACK** — אישור שההודעה טופלה בהצלחה. **בלי ACK, ההודעה חוזרת לתור.**

### למה זה כל כך חשוב אצלנו
```python
def on_message(ch, method, body):
    try:
        process_cv(json.loads(body))
        ch.basic_ack(method.delivery_tag)          # הצלחה → הסר מהתור
    except Exception:
        ch.basic_nack(method.delivery_tag, requeue=False)   # → DLQ
```
אם ה־Worker קורס באמצע עיבוד — אין ACK, ו־RabbitMQ מחזיר את ההודעה לתור. **אף CV לא הולך לאיבוד.** זו בדיוק סוג העמידות שמצפים לראות בפרויקט DevSecOps.

### מושגים נוספים שנשתמש בהם
- **Dead Letter Queue (DLQ)** — תור צדדי להודעות שנכשלו שוב ושוב. במקום לחסום את התור הראשי, הן ממתינות שם לבדיקה ידנית.
- **Prefetch = 1** — Worker לוקח הודעה אחת בכל פעם. מונע מצב שבו Worker אחד "תפס" 50 הודעות ואז קרס.
- **Scaling** — התור התארך? מפעילים עוד Worker, והם מתחלקים בעבודה אוטומטית. זה מה שנדגים ב־Kubernetes.

### RabbitMQ מול Redis Queue / Celery
Redis יכול לשמש כתור פשוט, אבל בלי ערבויות אמינות. Celery זו שכבה מעל (בדרך כלל מעל RabbitMQ) שמקלה על הכתיבה — אפשר לשקול אותה, אבל עבודה ישירה עם RabbitMQ מלמדת אתכם מה באמת קורה, וזה שווה יותר בפרויקט לימודי.

---

## 14. pdfplumber

### מה זה
ספרייה לחילוץ טקסט מקובצי PDF.

```python
import pdfplumber

def extract_text(path: str) -> str:
    with pdfplumber.open(path) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)
```

### למה דווקא היא
PDF הוא פורמט של **מיקום ויזואלי**, לא של טקסט מסודר. הוא אומר "המילה Python נמצאת בקואורדינטה (72, 340)" — ולא "זו השורה השנייה". קורות חיים עם שתי עמודות הם סיוט: קורא נאיבי יערבב את העמודות לג'יבריש.

pdfplumber נותן גישה למיקום המדויק של כל מילה, כך שאפשר לזהות עמודות ולקרוא אותן נכון.

### מה שחייבים לטפל בו
```python
text = extract_text(path)
if len(text.strip()) < 100:
    raise ValueError("PDF ללא טקסט — כנראה קובץ סרוק")
```
CV שנסרק מהנייר הוא בעצם תמונה. אין בו טקסט לחלץ. **חייבים להחזיר הודעת שגיאה ברורה למשתמש** ולא ליפול בשקט.

---

## 15. spaCy

### מה זה
ספריית NLP (עיבוד שפה טבעית) לניתוח טקסט: זיהוי מילים, משפטים, חלקי דיבר וישויות.

### מה נשתמש בו — PhraseMatcher
זיהוי מהיר של כישורים מתוך מילון:

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

### למה לא פשוט חיפוש מחרוזות
```python
"react" in "I have experience with reactive programming"   # ❌ True שגוי
```
spaCy מפרק לפי גבולות מילים אמיתיים ולא ייתפס לזה. הוא גם מטפל בהטיות (`developing` → `develop`).

### שימוש נוסף — Lemmatization ופיצול משפטים
נצטרך את פיצול המשפטים בשביל השלב הבא: כדי להשוות משפט־משפט מול תיאורי כישורים.

### מגבלה
spaCy מוצא רק מה שכתוב במפורש. `"ניסיון בתזמור קונטיינרים"` לא מכיל את המילה Kubernetes, אז spaCy יפספס אותו. בשביל זה יש את הכלי הבא.

---

## 16. Sentence Transformers

### מה זה
מודל שממיר **משפט לוקטור מספרים** (embedding), כך שמשפטים בעלי משמעות דומה מקבלים וקטורים קרובים — גם אם אין להם אף מילה משותפת.

```python
from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer('all-MiniLM-L6-v2')

a = model.encode("Experience with container orchestration")
b = model.encode("Kubernetes")
c = model.encode("Graphic design in Photoshop")

util.cos_sim(a, b)   # ≈ 0.71  ← דומים!
util.cos_sim(a, c)   # ≈ 0.08  ← לא קשור
```

**זה הלב של "החכם" ב־Smart Job Platform.** בלי זה, המערכת שלנו היא Ctrl+F משופר.

### איך נשתמש בזה בפועל
```python
# פעם אחת — מחשבים embedding לכל כישור ושומרים
skill_vectors = model.encode([s.description for s in all_skills])

# לכל משפט ב-CV
for sentence in cv_sentences:
    vec = model.encode(sentence)
    scores = util.cos_sim(vec, skill_vectors)[0]
    for idx, score in enumerate(scores):
        if score > 0.60:
            found_skills.add(all_skills[idx])
```

### דברים מעשיים שחייבים לדעת
- **`all-MiniLM-L6-v2`** — 80MB, מהיר, רץ על CPU. מושלם לפרויקט הזה. אל תתחיל ממודל של 2GB.
- **חובה להוריד את המודל בזמן `docker build`**, לא בזמן ריצה. אחרת כל הפעלת Worker תוריד 80MB מהאינטרנט.
- **הסף (0.60) הוא פרמטר שדורש כיול.** נמוך מדי → כל משרה מותאמת לכולם. גבוה מדי → אין תוצאות. זו משימה AI-07 בתוכנית.
- זה מודל **אנגלית**. לקורות חיים בעברית נדרש מודל רב־לשוני (`paraphrase-multilingual-MiniLM-L12-v2`).

---

## 17. LLM API (Claude / GPT)

### איפה זה נכנס
לא לכל הצינור — **רק לחלקים שדורשים שיפוט, לא זיהוי.** קריאות API עולות כסף ולוקחות שניות, אז משתמשים בהן בחוכמה.

### שלושה שימושים מומלצים

**א. חילוץ מובנה במקרים מסובכים** — כשה־pipeline הרגיל מחזיר תוצאה חלשה:
```python
prompt = f"""Extract skills from this CV section.
Return ONLY valid JSON: {{"skills": [], "years_experience": 0}}

{cv_section}"""
```

**ב. ניסוח הסבר להתאמה** — במקום "ציון 72%", המשתמש מקבל:
> "אתה מתאים למשרה בזכות ניסיונך ב־Docker ו־CI/CD. הפער העיקרי הוא Kubernetes, שמופיע כדרישת חובה."

**ג. המלצות מותאמות** — "בהתבסס על 5 המשרות שהכי התאמת להן, הכישור המשתלם ביותר ללמוד הוא X, כי הוא יפתח לך 12 משרות נוספות."

### כללי עבודה
1. **תמיד ליד ה־pipeline המקומי, לא במקומו.** spaCy + Sentence Transformers עושים 80% מהעבודה בחינם ובאופן צפוי.
2. **לבקש JSON במפורש** ולעטוף את ה־parsing ב־try/except — המודל עלול להוסיף טקסט מסביב.
3. **המפתח ב־Secret**, אף פעם לא בקוד. נבדק על ידי gitleaks ב־CI.
4. **Timeout ו־fallback** — אם ה־API לא זמין, המערכת חייבת להמשיך לעבוד בלעדיו.

---

# איך הכל מתחבר — מסע של העלאת CV

```
1. משתמש בוחר קובץ במסך ResumeUpload
   React (state) + Tailwind (עיצוב) + TypeScript (טיפוס File)

2. לחיצה על "העלה"
   TanStack Query useMutation → Axios POST /resume/upload
   Axios interceptor מוסיף JWT

3. FastAPI מקבל
   Pydantic מוודא סוג וגודל קובץ
   Depends(get_current_user) מאמת את ה-token

4. ה-Service שומר קובץ ויוצר רשומה
   SQLAlchemy → PostgreSQL: resumes(status='pending')

5. Producer שולח הודעה
   RabbitMQ queue: cv.process

6. השרת מחזיר 202 תוך ~200ms
   TanStack Query מתחיל polling כל 3 שניות

   ─── מכאן ברקע, ב-Worker נפרד ───

7. Worker לוקח מהתור, status = 'processing'
8. pdfplumber מחלץ טקסט מה-PDF
9. spaCy מפצל למשפטים ומזהה skills מפורשים
10. Sentence Transformers מזהה skills משתמעים
11. SQLAlchemy שומר ל-ai_analysis + user_skills
12. Matching Service משווה מול כל המשרות
13. תוצאות ל-matching_results, status = 'done'
14. ACK ל-RabbitMQ — ההודעה הוסרה מהתור

   ─── חזרה למשתמש ───

15. ה-polling מקבל status = 'done' ומפסיק
16. TanStack Query invalidate → טוען את הכישורים והתוצאות
17. המסך מציג SkillBadge לכל כישור ו-MatchScoreCard לכל משרה
```

---

# טבלת סיכום

| שכבה | כלי | בשורה אחת |
|---|---|---|
| UI | **React** | בונה מסכים מקומפוננטות שמתעדכנות לבד |
| בטיחות קוד | **TypeScript** | תופס טעויות לפני ההרצה |
| עיצוב | **Tailwind** | עיצוב במחלקות קטנות בתוך ה־HTML |
| בנייה | **Vite** | שרת פיתוח מהיר + אריזה לייצור |
| HTTP | **Axios** | שולח בקשות, מוסיף token אוטומטית |
| נתוני שרת | **TanStack Query** | cache, loading, שגיאות ורענון בלי קוד |
| API | **FastAPI** | REST מהיר עם ולידציה ותיעוד אוטומטיים |
| חוזה נתונים | **Pydantic** | מאמת קלט ומסנן פלט |
| אחסון | **PostgreSQL** | טבלאות, קשרים, חיפוש טקסט |
| גישה ל־DB | **SQLAlchemy** | Python במקום SQL, מוגן מ־injection |
| שינויי סכמה | **Alembic** | migrations מגורסאות ב־git |
| מהירות | **Redis** | cache בזיכרון + rate limiting |
| אסינכרוני | **RabbitMQ** | מעביר עבודה כבדה לרקע, בלי לאבד משימות |
| קבצים | **pdfplumber** | מחלץ טקסט מ־PDF |
| NLP | **spaCy** | מזהה כישורים שכתובים במפורש |
| סמנטיקה | **Sentence Transformers** | מזהה כישורים משתמעים לפי משמעות |
| שיפוט | **LLM API** | הסברים והמלצות בשפה טבעית |

---

# סדר לימוד מומלץ

אם אתה לא מכיר את הכלים, אל תלמד את כולם במקביל. הסדר הזה מתאים לסדר הבנייה:

1. **FastAPI + Pydantic** — תוך יום־יומיים יש לך API עובד ב־`/docs`
2. **SQLAlchemy + Alembic** — הכי הרבה מלכודות, שווה זמן
3. **React + TypeScript** — יחד, לא בנפרד
4. **Tailwind** — נלמד תוך כדי, לא צריך קורס
5. **Axios + TanStack Query** — יומיים, וזה חוסך שבועות
6. **pdfplumber + spaCy** — ישירות בקוד, פשוטים יחסית
7. **RabbitMQ** — רק כשמגיעים לעיבוד רקע
8. **Redis** — הכי קל, אפשר להשאיר לסוף
9. **Sentence Transformers** — הכי מעניין, ודורש הכי הרבה ניסוי וטעייה
