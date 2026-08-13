/**
 * Canonical catalogue. Keys defined here are the contract: `he.ts` is typed as
 * Record<TranslationKey, string>, so a missing or misspelled Hebrew key is a
 * compile error rather than a blank string in production.
 *
 * Plural forms carry a category suffix. Hebrew distinguishes one/two/many/other
 * where English only has one/other, so every plural family defines all four and
 * English simply repeats itself.
 */
export const en = {
  'app.name': 'JobMatch AI',
  'app.tagline': 'Find the roles you actually match',

  'common.loading': 'Loading',
  'common.retry': 'Try again',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.close': 'Close',
  'common.search': 'Search',
  'common.skip': 'Skip',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.remove': 'Remove',
  'common.dismiss': 'Dismiss',

  'nav.dashboard': 'Dashboard',
  'nav.jobs': 'Jobs',
  'nav.cv': 'CV Analysis',
  'nav.applications': 'Applications',
  'nav.market': 'Market',
  'nav.settings': 'Settings',
  'nav.signOut': 'Sign out',
  'nav.openMenu': 'Open menu',
  'nav.closeMenu': 'Close menu',
  'nav.collapseSidebar': 'Collapse sidebar',
  'nav.expandSidebar': 'Expand sidebar',
  'nav.skipToContent': 'Skip to main content',

  'theme.toggle': 'Switch theme',
  'theme.light': 'Light',
  'theme.dark': 'Dark',

  'locale.switch': 'Change language',
  'locale.en': 'English',
  'locale.he': 'עברית',

  'auth.signIn': 'Sign in',
  'auth.signUp': 'Sign up',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.fullName': 'Full name',

  'match.high': 'Strong match',
  'match.medium': 'Partial match',
  'match.low': 'Weak match',
  'match.scoreLabel': 'Match score {score}%',

  'state.emptyTitle': 'Nothing here yet',
  'state.emptyBody': 'Once there is data to show, it will appear here.',
  'state.errorTitle': 'Something went wrong',
  'state.errorBody': 'The request did not complete. You can try again.',

  'error.UNAUTHORIZED': 'Your session has expired. Please sign in again.',
  'error.FORBIDDEN': 'You do not have access to this.',
  'error.NOT_FOUND': 'We could not find what you were looking for.',
  'error.VALIDATION_FAILED': 'Please check the highlighted fields.',
  'error.FILE_TOO_LARGE': 'That file is larger than 5 MB.',
  'error.UNSUPPORTED_FILE_TYPE': 'Only PDF and DOCX files are accepted.',
  'error.CONFLICT': 'That action conflicts with the current state.',
  'error.RATE_LIMITED': 'Too many requests. Please wait a moment.',
  'error.SERVER_ERROR': 'The server ran into a problem.',
  'error.NETWORK_ERROR': 'Could not reach the server.',
  'error.TIMEOUT': 'The request took too long.',
  'error.CANCELLED': 'The request was cancelled.',
  'error.UNKNOWN': 'An unexpected error occurred.',

  'jobs.count_one': '{count} job',
  'jobs.count_two': '{count} jobs',
  'jobs.count_many': '{count} jobs',
  'jobs.count_other': '{count} jobs',

  'dev.title': 'Component gallery',
  'dev.subtitle': 'Foundation primitives and mock controls.',
  'dev.resetDb': 'Reset mock database',
  'dev.faults': 'Inject fault',
  'dev.faultsNone': 'No fault',
} as const;
