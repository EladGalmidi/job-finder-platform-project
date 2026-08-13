import type { TranslationKey } from '@/i18n/types';

export interface NavItem {
  readonly to: string;
  readonly labelKey: TranslationKey;
  /** Text glyph stands in for an icon set; replaced when icons land. */
  readonly glyph: string;
  /** Shown in the mobile tab bar (max five items). */
  readonly primary: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', glyph: '◧', primary: true },
  { to: '/dashboard/jobs', labelKey: 'nav.jobs', glyph: '◆', primary: true },
  { to: '/dashboard/cv', labelKey: 'nav.cv', glyph: '▤', primary: true },
  { to: '/dashboard/applications', labelKey: 'nav.applications', glyph: '▣', primary: true },
  { to: '/dashboard/market', labelKey: 'nav.market', glyph: '◭', primary: true },
  { to: '/settings', labelKey: 'nav.settings', glyph: '⚙', primary: false },
];
