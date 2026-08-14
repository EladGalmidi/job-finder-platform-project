import { useEffect, useState, type FormEvent } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { JobCard } from '@/components/domain/JobCard/JobCard';
import { QueryBoundary } from '@/components/feedback/QueryBoundary';
import { Button } from '@/components/ui/Button/Button';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { Select } from '@/components/ui/Select/Select';
import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import { Tabs } from '@/components/ui/Tabs/Tabs';
import {
  selectApplicationByJobId,
  selectIsJobMutating,
} from '@/features/applications/applicationsSlice';
import {
  fetchJobs,
  jobsQueryKey,
  selectJobById,
  selectJobList,
  selectMatchByJobId,
} from '@/features/jobs/jobsSlice';
import { filtersToggled, selectRefreshToken } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';
import { useBreakpointDown } from '@/lib/useMediaQuery';
import type { JobId, JobSort, JobTab } from '@/types';

import { JobFilters } from './components/JobFilters';
import { jobDetailPath, useJobActions } from './useJobActions';
import { useJobsQuery } from './useJobsQuery';
import styles from './Jobs.module.css';

const PAGE_SIZE = 10;

export const JobsPage = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { t, tPlural } = useTranslation();
  const api = useJobsQuery();
  const actions = useJobActions();
  const isMobile = useBreakpointDown('md');
  const refreshToken = useAppSelector(selectRefreshToken);
  const { search } = useLocation();

  const { query, setQuery, clearFilters, activeFilterCount } = api;

  // Local mirror so typing does not rewrite the URL on every keystroke; the URL
  // is still the source of truth and is updated on submit.
  const [term, setTerm] = useState(query.q);

  useEffect(() => {
    setTerm(query.q);
  }, [query.q]);

  const listKey = jobsQueryKey(query);
  const list = useAppSelector((state) => selectJobList(state, listKey));

  // `query` is memoised on the URL search params, so its identity only changes
  // when the query actually changes — safe to depend on directly.
  useEffect(() => {
    void dispatch(fetchJobs(query));
  }, [dispatch, query, refreshToken]);

  const onSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setQuery({ q: term.trim() });
  };

  const ids = list?.ids ?? [];
  const total = list?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tabItems: { id: JobTab; label: string }[] = [
    { id: 'all', label: t('jobs.tabAll') },
    { id: 'fullMatch', label: t('jobs.tabFullMatch') },
    { id: 'new', label: t('jobs.tabNew') },
    { id: 'saved', label: t('jobs.tabSaved') },
  ];

  const hasQuery = query.q !== '' || activeFilterCount > 0;

  const emptyState =
    query.tab === 'saved' && !hasQuery ? (
      <EmptyState
        icon="☆"
        title={t('jobs.savedEmptyTitle')}
        body={t('jobs.savedEmptyBody')}
        action={
          <Button variant="secondary" onClick={() => setQuery({ tab: 'all' })}>
            {t('jobs.tabAll')}
          </Button>
        }
      />
    ) : hasQuery ? (
      <EmptyState
        icon="⌕"
        title={t('jobs.noResultsTitle')}
        body={t('jobs.noResultsBody')}
        action={
          <Button variant="secondary" onClick={clearFilters}>
            {t('jobs.filtersClear')}
          </Button>
        }
      />
    ) : (
      <EmptyState icon="◆" title={t('jobs.emptyTitle')} body={t('jobs.emptyBody')} />
    );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{t('jobs.title')}</h2>
          <p className={styles.subtitle}>{t('jobs.subtitle')}</p>
        </div>
      </header>

      <div className={styles.controls}>
        <form className={styles.searchForm} onSubmit={onSearch} role="search">
          <span className={styles.searchIcon} aria-hidden="true">
            ⌕
          </span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder={t('jobs.searchPlaceholder')}
            aria-label={t('jobs.searchPlaceholder')}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
        </form>

        <div className={styles.sortSelect}>
          <Select
            hideLabel
            label={t('jobs.sortLabel')}
            value={query.sort}
            onChange={(event) => setQuery({ sort: event.target.value as JobSort })}
            options={[
              { value: 'relevance', label: t('jobs.sortRelevance') },
              { value: 'newest', label: t('jobs.sortNewest') },
              { value: 'salaryDesc', label: t('jobs.sortSalaryDesc') },
              { value: 'salaryAsc', label: t('jobs.sortSalaryAsc') },
            ]}
          />
        </div>

        {isMobile ? (
          <Button variant="secondary" onClick={() => dispatch(filtersToggled())}>
            {t('jobs.filtersShow')}
            {activeFilterCount > 0 ? ` (${String(activeFilterCount)})` : ''}
          </Button>
        ) : null}
      </div>

      <div className={styles.toolbar}>
        <Tabs
          items={tabItems}
          value={query.tab}
          onChange={(tab) => setQuery({ tab })}
          ariaLabel={t('jobs.title')}
        />
        <span className={styles.resultCount} aria-live="polite">
          {list?.status === 'succeeded' ? tPlural('jobs.results', total) : ''}
        </span>
      </div>

      <div className={cx(styles.body, isMobile && styles.bodyNoFilters)}>
        <JobFilters api={api} />

        <div className={styles.list}>
          <QueryBoundary
            status={list?.status ?? 'loading'}
            error={list?.error ?? null}
            isEmpty={ids.length === 0}
            onRetry={() => void dispatch(fetchJobs(query))}
            skeleton={
              <div className={styles.list}>
                <Skeleton variant="block" height="190px" />
                <Skeleton variant="block" height="190px" />
                <Skeleton variant="block" height="190px" />
              </div>
            }
            empty={emptyState}
          >
            {ids.map((jobId) => (
              <ConnectedJobCard key={jobId} jobId={jobId} actions={actions} search={search} />
            ))}

            {totalPages > 1 ? (
              <nav className={styles.pagination} aria-label={t('jobs.pagination')}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={query.page <= 1}
                  onClick={() => setQuery({ page: query.page - 1 })}
                >
                  {t('common.back')}
                </Button>
                <span className={styles.pageInfo}>
                  {query.page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={query.page >= totalPages}
                  onClick={() => setQuery({ page: query.page + 1 })}
                >
                  {t('common.next')}
                </Button>
              </nav>
            ) : null}
          </QueryBoundary>
        </div>
      </div>

      {/* The detail drawer is a nested route, so it renders over this list. */}
      <Outlet />
    </div>
  );
};

const ConnectedJobCard = ({
  jobId,
  actions,
  search,
}: {
  jobId: JobId;
  actions: ReturnType<typeof useJobActions>;
  /** Carried into the detail URL so closing the drawer restores the filters. */
  search: string;
}): React.JSX.Element | null => {
  const job = useAppSelector((state) => selectJobById(state, jobId));
  const match = useAppSelector((state) => selectMatchByJobId(state, jobId));
  const application = useAppSelector((state) => selectApplicationByJobId(state, jobId));
  const isMutating = useAppSelector((state) => selectIsJobMutating(state, jobId));

  if (job === null) return null;

  return (
    <JobCard
      job={job}
      match={match}
      status={application?.status ?? null}
      isMutating={isMutating}
      detailPath={`${jobDetailPath(job.id)}${search}`}
      onSave={() => {
        if (application !== null && application.status === 'saved') {
          actions.unsave(job, application.id);
          return;
        }
        actions.save(job);
      }}
      onApply={() => actions.apply(job)}
      onShare={() => actions.share(job)}
    />
  );
};
