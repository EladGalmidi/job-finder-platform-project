import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { QueryBoundary } from '@/components/feedback/QueryBoundary';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog/ConfirmDialog';
import { LinkButton } from '@/components/ui/Button/LinkButton';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { Select } from '@/components/ui/Select/Select';
import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import { selectJobEntities } from '@/features/jobs/jobsSlice';
import { selectRefreshToken, toastPushed } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';
import { formatRelativeTime } from '@/lib/format';
import { APPLICATION_STATUS_LABEL, APPLICATION_STATUS_TONE } from '@/lib/labels';
import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationId,
  type ApplicationSort,
  type ApplicationStatus,
} from '@/types';

import { ApplicationDetail } from './ApplicationDetail';
import {
  changeApplicationStatus,
  fetchApplications,
  removeApplication,
  selectAllApplications,
  selectApplicationsStatus,
} from './applicationsSlice';
import styles from './Applications.module.css';

export const ApplicationsPage = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { t, tPlural, locale } = useTranslation();

  const applications = useAppSelector(selectAllApplications);
  const status = useAppSelector(selectApplicationsStatus);
  const jobs = useAppSelector(selectJobEntities);
  const refreshToken = useAppSelector(selectRefreshToken);

  const [term, setTerm] = useState('');
  const [submittedTerm, setSubmittedTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [sort, setSort] = useState<ApplicationSort>('recent');
  const [openId, setOpenId] = useState<ApplicationId | null>(null);
  const [removingId, setRemovingId] = useState<ApplicationId | null>(null);

  useEffect(() => {
    void dispatch(fetchApplications({ q: '', statuses: [], sort: 'recent' }));
  }, [dispatch, refreshToken]);

  /**
   * Filtering and sorting run client-side here.
   *
   * The endpoint supports both, but the full set is already loaded for the
   * sidebar badge, and a user's application list is small enough that a round
   * trip per keystroke would be slower than filtering in place.
   */
  const visible = useMemo(() => {
    const needle = submittedTerm.trim().toLowerCase();

    const rows = applications.filter((application) => {
      if (statusFilter !== 'all' && application.status !== statusFilter) return false;
      if (needle === '') return true;

      const job = jobs[application.jobId];
      if (job === undefined) return false;
      return (
        job.title.toLowerCase().includes(needle) ||
        job.company.name.toLowerCase().includes(needle) ||
        job.location.toLowerCase().includes(needle)
      );
    });

    return [...rows].sort((left, right) => {
      switch (sort) {
        case 'oldest':
          return new Date(left.savedAt).getTime() - new Date(right.savedAt).getTime();
        case 'company':
          return (jobs[left.jobId]?.company.name ?? '').localeCompare(
            jobs[right.jobId]?.company.name ?? '',
          );
        case 'status':
          return (
            APPLICATION_STATUSES.indexOf(left.status) - APPLICATION_STATUSES.indexOf(right.status)
          );
        default:
          return new Date(right.lastUpdatedAt).getTime() - new Date(left.lastUpdatedAt).getTime();
      }
    });
  }, [applications, jobs, statusFilter, sort, submittedTerm]);

  const countByStatus = useMemo(() => {
    const counts: Record<ApplicationStatus, number> = {
      saved: 0,
      applied: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };
    for (const application of applications) counts[application.status] += 1;
    return counts;
  }, [applications]);

  const open = openId === null ? null : (applications.find((a) => a.id === openId) ?? null);
  const openJob = open === null ? undefined : jobs[open.jobId];

  const onSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setSubmittedTerm(term);
  };

  const onStatusChange = (application: Application, next: ApplicationStatus): void => {
    void dispatch(changeApplicationStatus({ id: application.id, status: next })).then((result) => {
      if (changeApplicationStatus.fulfilled.match(result)) {
        dispatch(
          toastPushed({
            severity: 'success',
            title: t('applications.statusChanged', { status: t(APPLICATION_STATUS_LABEL[next]) }),
          }),
        );
        return;
      }
      dispatch(toastPushed({ severity: 'danger', title: t('applications.actionFailed') }));
    });
  };

  /**
   * Removal is destructive with no undo, so it is confirmed first. The pending
   * application is held in state rather than a boolean: the dialog needs to
   * name what it is about to delete, and the row it came from can disappear
   * from `visible` while the dialog is open.
   */
  const onConfirmRemove = (): void => {
    if (removingId === null) return;
    const id = removingId;
    setRemovingId(null);

    void dispatch(removeApplication(id)).then((result) => {
      if (removeApplication.fulfilled.match(result)) {
        dispatch(toastPushed({ severity: 'info', title: t('applications.removed') }));
        return;
      }
      dispatch(toastPushed({ severity: 'danger', title: t('applications.actionFailed') }));
    });
  };

  const hasFilters = statusFilter !== 'all' || submittedTerm.trim() !== '';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{t('applications.title')}</h2>
          <p className={styles.subtitle}>{t('applications.subtitle')}</p>
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
            placeholder={t('applications.searchPlaceholder')}
            aria-label={t('applications.searchPlaceholder')}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
        </form>

        <div className={styles.sortSelect}>
          <Select
            hideLabel
            label={t('jobs.sortLabel')}
            value={sort}
            onChange={(event) => setSort(event.target.value as ApplicationSort)}
            options={[
              { value: 'recent', label: t('applications.sortRecent') },
              { value: 'oldest', label: t('applications.sortOldest') },
              { value: 'company', label: t('applications.sortCompany') },
              { value: 'status', label: t('applications.sortStatus') },
            ]}
          />
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.statusFilters} role="group" aria-label={t('applications.filterStatus')}>
          <button
            type="button"
            className={cx(styles.statusChip, statusFilter === 'all' && styles.statusChipActive)}
            aria-pressed={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          >
            {t('applications.filterAll')}
            <span className={styles.statusCount}>{applications.length}</span>
          </button>

          {APPLICATION_STATUSES.map((value) => (
            <button
              key={value}
              type="button"
              className={cx(styles.statusChip, statusFilter === value && styles.statusChipActive)}
              aria-pressed={statusFilter === value}
              onClick={() => setStatusFilter(value)}
            >
              {t(APPLICATION_STATUS_LABEL[value])}
              <span className={styles.statusCount}>{countByStatus[value]}</span>
            </button>
          ))}
        </div>

        <span className={styles.resultCount} aria-live="polite">
          {status === 'succeeded' ? tPlural('applications.count', visible.length) : ''}
        </span>
      </div>

      <QueryBoundary
        status={status}
        isEmpty={visible.length === 0}
        onRetry={() =>
          void dispatch(fetchApplications({ q: '', statuses: [], sort: 'recent' }))
        }
        skeleton={
          <div className={styles.list}>
            <Skeleton variant="block" height="86px" />
            <Skeleton variant="block" height="86px" />
            <Skeleton variant="block" height="86px" />
          </div>
        }
        empty={
          hasFilters ? (
            <EmptyState
              icon="⌕"
              title={t('applications.noResultsTitle')}
              body={t('applications.noResultsBody')}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStatusFilter('all');
                    setTerm('');
                    setSubmittedTerm('');
                  }}
                >
                  {t('jobs.filtersClear')}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon="▣"
              title={t('applications.emptyTitle')}
              body={t('applications.emptyBody')}
              action={
                <LinkButton to="/dashboard/jobs">{t('applications.emptyCta')}</LinkButton>
              }
            />
          )
        }
      >
        <div className={styles.list}>
          {visible.map((application) => {
            const job = jobs[application.jobId];
            if (job === undefined) return null;

            return (
              <article key={application.id} className={styles.row}>
                <span
                  className={styles.logo}
                  style={{ backgroundColor: job.company.logoColor }}
                  aria-hidden="true"
                >
                  {job.company.logoText}
                </span>

                <div className={styles.rowBody}>
                  <button
                    type="button"
                    className={styles.rowTitle}
                    onClick={() => setOpenId(application.id)}
                  >
                    {job.title}
                  </button>
                  <div className={styles.rowMeta}>
                    <span>{job.company.name}</span>
                    <span>{job.location}</span>
                    <span>
                      {t('applications.updatedOn', {
                        when: formatRelativeTime(locale, application.lastUpdatedAt),
                      })}
                    </span>
                    {application.nextStep === null ? null : (
                      <span className={styles.nextStep}>
                        <span aria-hidden="true">⏱</span>
                        {application.nextStep.label}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.rowSide}>
                  <Badge tone={APPLICATION_STATUS_TONE[application.status]}>
                    {t(APPLICATION_STATUS_LABEL[application.status])}
                  </Badge>

                  <div className={styles.statusSelect}>
                    <Select
                      hideLabel
                      label={t('applications.changeStatus')}
                      value={application.status}
                      onChange={(event) =>
                        onStatusChange(application, event.target.value as ApplicationStatus)
                      }
                      options={APPLICATION_STATUSES.map((value) => ({
                        value,
                        label: t(APPLICATION_STATUS_LABEL[value]),
                      }))}
                    />
                  </div>

                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => setRemovingId(application.id)}
                    aria-label={t('applications.remove')}
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </QueryBoundary>

      {open === null || openJob === undefined ? null : (
        <ApplicationDetail
          application={open}
          job={openJob}
          onClose={() => setOpenId(null)}
        />
      )}

      <ConfirmDialog
        isOpen={removingId !== null}
        title={t('applications.removeConfirmTitle')}
        body={t('applications.removeConfirm')}
        confirmLabel={t('applications.remove')}
        cancelLabel={t('common.cancel')}
        onConfirm={onConfirmRemove}
        onCancel={() => setRemovingId(null)}
      />
    </div>
  );
};
