import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button/Button';
import { filtersClosed, selectFiltersOpen } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { useBreakpointDown } from '@/lib/useMediaQuery';
import { cx } from '@/lib/cx';
import {
  JOB_TYPE_LABEL,
  LOCATION_OPTIONS,
  REMOTE_LABEL,
  ROLE_LABEL,
  SENIORITY_LABEL,
} from '@/lib/labels';
import {
  JOB_TYPES,
  REMOTE_MODES,
  ROLE_KEYS,
  SENIORITIES,
  type JobType,
  type RemoteMode,
  type RoleKey,
  type Seniority,
} from '@/types';

import type { JobsQueryApi } from '../useJobsQuery';
import styles from '../Jobs.module.css';

const SALARY_STEPS = [15000, 20000, 25000, 30000, 35000, 40000];

const toggle = <T,>(list: readonly T[], value: T): T[] =>
  list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];

export interface JobFiltersProps {
  readonly api: JobsQueryApi;
}

/**
 * Sticky sidebar panel on desktop, bottom sheet on mobile — the same markup,
 * repositioned by CSS, so filter state cannot diverge between the two.
 */
export const JobFilters = ({ api }: JobFiltersProps): React.JSX.Element | null => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectFiltersOpen);
  const isMobile = useBreakpointDown('md');
  const { t } = useTranslation();

  const { query, setQuery, clearFilters, activeFilterCount } = api;

  // On mobile the panel is modal and only rendered when opened; on desktop it
  // is always present.
  if (isMobile && !isOpen) return null;

  const group = <T extends string>(
    labelKey: Parameters<typeof t>[0],
    options: readonly T[],
    selected: readonly T[],
    labelFor: (value: T) => string,
    onToggle: (next: T[]) => void,
  ): React.JSX.Element => (
    <div className={styles.filterGroup}>
      <span className={styles.filterLabel}>{t(labelKey)}</span>
      <div className={styles.filterOptions}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              className={cx(styles.filterChip, active && styles.filterChipActive)}
              aria-pressed={active}
              onClick={() => onToggle(toggle(selected, option))}
            >
              {active ? <span aria-hidden="true">✓ </span> : null}
              {labelFor(option)}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <div
          className={styles.filtersScrim}
          onClick={() => dispatch(filtersClosed())}
          aria-hidden="true"
        />
      ) : null}

      <aside className={styles.filters} aria-label={t('jobs.filtersTitle')}>
        <div className={styles.filtersHead}>
          <h2 className={styles.filtersTitle}>{t('jobs.filtersTitle')}</h2>
          {activeFilterCount > 0 ? (
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              {t('jobs.filtersClear')}
            </Button>
          ) : null}
        </div>

        {group('jobs.filterRole', ROLE_KEYS, query.roles, (role: RoleKey) => t(ROLE_LABEL[role]), (next) =>
          setQuery({ roles: next }),
        )}

        {group('jobs.filterLocation', LOCATION_OPTIONS, query.locations, (location) => location, (next) =>
          setQuery({ locations: next }),
        )}

        {group(
          'jobs.filterRemote',
          REMOTE_MODES,
          query.remoteModes,
          (mode: RemoteMode) => t(REMOTE_LABEL[mode]),
          (next) => setQuery({ remoteModes: next }),
        )}

        {group(
          'jobs.filterJobType',
          JOB_TYPES,
          query.jobTypes,
          (type: JobType) => t(JOB_TYPE_LABEL[type]),
          (next) => setQuery({ jobTypes: next }),
        )}

        {group(
          'jobs.filterSeniority',
          SENIORITIES,
          query.seniorities,
          (level: Seniority) => t(SENIORITY_LABEL[level]),
          (next) => setQuery({ seniorities: next }),
        )}

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>{t('jobs.filterSalaryMin')}</span>
          <div className={styles.filterOptions}>
            <button
              type="button"
              className={cx(styles.filterChip, query.salaryMin === null && styles.filterChipActive)}
              aria-pressed={query.salaryMin === null}
              onClick={() => setQuery({ salaryMin: null })}
            >
              {t('jobs.filterSalaryAny')}
            </button>
            {SALARY_STEPS.map((amount) => (
              <button
                key={amount}
                type="button"
                className={cx(
                  styles.filterChip,
                  query.salaryMin === amount && styles.filterChipActive,
                )}
                aria-pressed={query.salaryMin === amount}
                onClick={() => setQuery({ salaryMin: amount })}
              >
                ₪{amount / 1000}k+
              </button>
            ))}
          </div>
        </div>

        {isMobile ? (
          <div className={styles.filtersFooter}>
            <Button variant="secondary" fullWidth onClick={clearFilters}>
              {t('jobs.filtersClear')}
            </Button>
            <Button fullWidth onClick={() => dispatch(filtersClosed())}>
              {t('jobs.filtersApply')}
            </Button>
          </div>
        ) : null}
      </aside>
    </>
  );
};
