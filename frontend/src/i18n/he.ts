import type { Catalog } from './types';

/**
 * Typed as Catalog, so this file cannot compile while a key is missing.
 * Copy here should be reviewed by a native speaker before launch.
 */
export const he: Catalog = {
  'app.name': 'JobMatch AI',
  'app.tagline': 'מצאו את המשרות שבאמת מתאימות לכם',

  'common.loading': 'טוען',
  'common.retry': 'נסו שוב',
  'common.cancel': 'ביטול',
  'common.save': 'שמירה',
  'common.close': 'סגירה',
  'common.search': 'חיפוש',
  'common.skip': 'דילוג',
  'common.back': 'חזרה',
  'common.next': 'הבא',
  'common.remove': 'הסרה',
  'common.dismiss': 'סגירה',

  'nav.dashboard': 'דשבורד',
  'nav.jobs': 'משרות',
  'nav.cv': 'ניתוח קורות חיים',
  'nav.applications': 'מועמדויות',
  'nav.market': 'ניתוח שוק',
  'nav.settings': 'הגדרות',
  'nav.signOut': 'התנתקות',
  'nav.openMenu': 'פתיחת תפריט',
  'nav.closeMenu': 'סגירת תפריט',
  'nav.collapseSidebar': 'צמצום תפריט צד',
  'nav.expandSidebar': 'הרחבת תפריט צד',
  'nav.skipToContent': 'דילוג לתוכן הראשי',

  'theme.toggle': 'החלפת ערכת נושא',
  'theme.light': 'בהיר',
  'theme.dark': 'כהה',

  'locale.switch': 'שינוי שפה',
  'locale.en': 'English',
  'locale.he': 'עברית',

  'auth.signIn': 'התחברות',
  'auth.signUp': 'הרשמה',
  'auth.email': 'אימייל',
  'auth.password': 'סיסמה',
  'auth.fullName': 'שם מלא',

  'match.high': 'התאמה גבוהה',
  'match.medium': 'התאמה חלקית',
  'match.low': 'התאמה נמוכה',
  'match.scoreLabel': 'ציון התאמה {score}%',

  'state.emptyTitle': 'אין כאן עדיין תוכן',
  'state.emptyBody': 'ברגע שיהיו נתונים להצגה, הם יופיעו כאן.',
  'state.errorTitle': 'משהו השתבש',
  'state.errorBody': 'הבקשה לא הושלמה. אפשר לנסות שוב.',

  'error.UNAUTHORIZED': 'תוקף ההתחברות פג. יש להתחבר מחדש.',
  'error.FORBIDDEN': 'אין לכם הרשאה לתוכן הזה.',
  'error.NOT_FOUND': 'לא הצלחנו למצוא את מה שחיפשתם.',
  'error.VALIDATION_FAILED': 'יש לבדוק את השדות המסומנים.',
  'error.FILE_TOO_LARGE': 'הקובץ גדול מ-5 מגהבייט.',
  'error.UNSUPPORTED_FILE_TYPE': 'ניתן להעלות קבצי PDF או DOCX בלבד.',
  'error.CONFLICT': 'הפעולה מתנגשת עם המצב הנוכחי.',
  'error.RATE_LIMITED': 'יותר מדי בקשות. נסו שוב בעוד רגע.',
  'error.SERVER_ERROR': 'אירעה תקלה בשרת.',
  'error.NETWORK_ERROR': 'לא הצלחנו להתחבר לשרת.',
  'error.TIMEOUT': 'הבקשה ארכה זמן רב מדי.',
  'error.CANCELLED': 'הבקשה בוטלה.',
  'error.UNKNOWN': 'אירעה שגיאה בלתי צפויה.',

  'jobs.count_one': 'משרה אחת',
  'jobs.count_two': 'שתי משרות',
  'jobs.count_many': '{count} משרות',
  'jobs.count_other': '{count} משרות',

  'dev.title': 'גלריית קומפוננטות',
  'dev.subtitle': 'רכיבי היסוד ובקרות המוק.',
  'dev.resetDb': 'איפוס בסיס נתוני המוק',
  'dev.faults': 'הזרקת תקלה',
  'dev.faultsNone': 'ללא תקלה',
};
