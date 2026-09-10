// ajv-demo.mjs
// הדגמה חיה של AJV מול ה-contract האמיתי (cv-analysis.schema.json).
//
// מה זה עושה:
//   1. טוען את ה-schema מ-backend/contracts/
//   2. מקמפל אותו לפונקציית validate (בדיוק כמו שהצינור עושה)
//   3. מריץ אותה על CV "טוב"      → מצפה valid: true
//   4. מריץ אותה על CV "שבור"     → מצפה valid: false, עם רשימת שגיאות מדויקת
//
// איך מריצים (מתוך תיקיית backend, ששם כבר מותקן ajv):
//   node ajv-demo.mjs
// אם ajv-formats לא מותקן, הסר את שתי השורות המסומנות למטה (ראה הערה).

import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats"; // ← אם השורה הזו נכשלת, מחק אותה + השורה שמשתמשת בה למטה
import { readFileSync } from "node:fs";

// --- 1. טעינת ה-schema האמיתי מה-contract ---
const schema = JSON.parse(
  readFileSync("./contracts/cv-analysis.schema.json", "utf8")
);

// --- 2. קימפול ה-schema לפונקציית בדיקה ---
const ajv = new Ajv({ allErrors: true }); // allErrors: אסוף את כל השגיאות, לא רק הראשונה
addFormats(ajv); // ← תומך ב-"format": "date-time". מחק אם אין ajv-formats
const validate = ajv.compile(schema);

// --- עוזר קטן להדפסה יפה ---
function runCheck(label, data) {
  const valid = validate(data);
  console.log("\n" + "=".repeat(60));
  console.log(label);
  console.log("=".repeat(60));
  console.log("valid:", valid);
  if (!valid) {
    console.log("שגיאות שה-AJV מצא:");
    for (const err of validate.errors) {
      console.log(`  • בשדה "${err.instancePath || "(root)"}" — ${err.message}`);
      if (err.params && Object.keys(err.params).length) {
        console.log(`      פרטים:`, JSON.stringify(err.params));
      }
    }
  }
}

// --- 3. CV תקין (מבנה מינימלי שעומד בכל הכללים) ---
// מבוסס על ה-JSON האמיתי שיצא מ-Gemini, מקוצר לדוגמה.
const goodCv = {
  personalInformation: { fullName: "Elad", email: "elad@example.com" },
  technicalExperience: [
    {
      skill: "Linux",
      period: { startDate: "2016", endDate: "2018", isCurrent: false },
      experienceDuration: { unit: "years", value: 2 },
      usageDepth: { level: "working", activities: ["maintain server fleets"] },
      evidence: [
        {
          sourceExcerpt: "Maintained Linux server fleets across 200+ hosts.",
          employer: "Halcyon Software",
          role: "Systems / Build Engineer",
        },
      ],
    },
    {
      // כישור עם הרבה null — כמו DynamoDB אצלך. תקין! כי ה-schema מגדיר nullable.
      skill: "DynamoDB",
      period: { startDate: null, endDate: null, isCurrent: null },
      experienceDuration: { unit: "years", value: null },
      usageDepth: { level: "mentioned_only", activities: [] },
      evidence: [
        {
          sourceExcerpt: "Databases: PostgreSQL, Redis, MongoDB, DynamoDB",
          employer: null,
          role: null,
        },
      ],
    },
  ],
  nonTechnicalExperience: [],
  achievements: [],
  other: { title: "DevOps Engineer" },
};

runCheck("בדיקה 1: CV תקין  (מצפים ל-valid: true)", goodCv);

// --- 4. CV שבור — נשבור שלושה כללים בכוונה כדי לראות את AJV תופס ---
const brokenCv = structuredClone(goodCv);

// הפרה א': level שלא קיים ב-enum (מותר רק: mentioned_only/basic/working/deep)
brokenCv.technicalExperience[0].usageDepth.level = "expert";

// הפרה ב': שדה חובה חסר — נמחק את "skill" מהכישור השני
delete brokenCv.technicalExperience[1].skill;

// הפרה ג': שדה אסור — additionalProperties:false לא מרשה שדות מומצאים
brokenCv.technicalExperience[1].madeUpField = "לא אמור להיות כאן";

runCheck("בדיקה 2: CV שבור  (מצפים ל-valid: false + שגיאות)", brokenCv);

console.log("\n" + "=".repeat(60));
console.log("סיכום: בדיוק ההשוואה הזאת (data מול rules) קורית");
console.log("בתוך הצינור אחרי JSON.parse. valid:true → ממשיכים;");
console.log("valid:false → עוצרים, לא נשמר ב-DB, אין score.");
console.log("=".repeat(60));
