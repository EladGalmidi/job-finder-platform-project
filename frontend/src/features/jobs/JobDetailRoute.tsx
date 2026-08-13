import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { MatchScore } from '@/components/domain/MatchScore/MatchScore';
import { SkillTag } from '@/components/domain/SkillTag/SkillTag';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Drawer } from '@/components/ui/Drawer/Drawer';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import {
  selectApplicationByJobId,
  selectIsJobMutating,
} from '@/features/applications/applicationsSlice';
import {
  fetchJobDetail,
  selectJobById,
  selectJobDetailStatus,
  selectMatchByJobId,
} from '@/features/jobs/jobsSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';
import { formatRelativeTime, formatSalaryRange } from '@/lib/format';
import { JOB_TYPE_LABEL, REMOTE_LABEL, SENIORITY_LABEL } from '@/lib/labels';
import { asJobId, type MatchReason } from '@/types';

import { useJobActions } from './useJobActions';
import styles from './JobDetail.module.css';

const REASON_MARK: Record<MatchReason['impact'], string> = {
  positive: '✓',
  neutral: '·',
  negative: '✕',
};

const REASON_CLASS: Record<MatchReason['impact'], string> = {
  positive: styles.positive ?? '',
  neutral: styles.neutral ?? '',
  negative: styles.negative ?? '',
};

/**
 * Route-backed detail view at /dashboard/jobs/:jobId.
 *
 * Because it is a route rather than local drawer state, the URL can be shared,
 * the back button closes it, and a refresh reopens the same job. The Drawer
 * component handles the desktop-panel / mobile-full-screen split.
 */
export const JobDetailRoute = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const params = useParams();
  const { t, tPlural, locale } = useTranslation();
  const actions = useJobActions();

  const jobId = asJobId(params['jobId'] ?? '');

  const job = useAppSelector((state) => selectJobById(state, jobId));
  const match = useAppSelector((state) => selectMatchByJobId(state, jobId));
  const status = useAppSelector((state) => selectJobDetailStatus(state, jobId));
  const application = useAppSelector((state) => selectApplicationByJobId(state, jobId));
  const isMutating = useAppSelector((state) => selectIsJobMutating(state, jobId));

  useEffect(() => {
    if (jobId === '') return;
    void dispatch(fetchJobDetail(jobId));
  }, [dispatch, jobId]);

  // Closing returns to the list while preserving whatever query is in the URL.
  const close = (): void => {
    navigate({ pathname: '/dashboard/jobs', search: window.location.search });
  };

  const isSaved = application !== null;
  const isApplied = application !== null && application.status !== 'saved';

  const contentDir = job?.contentLanguage === 'he' ? 'rtl' : 'ltr';

  const footer =
    job === null ? undefined : (
      <div className={styles.footerActions}>
        <Button
          variant="secondary"
          onClick={() => actions.save(job)}
          disabled={isMutating || isSaved}
          iconStart={<span aria-hidden="true">{isSaved ? '★' : '☆'}</span>}
        >
          {isSaved ? t('jobs.saved') : t('jobs.save')}
        </Button>
        <Button variant="ghost" onClick={() => actions.share(job)}>
          {t('jobs.share')}
        </Button>
        <Button
          fullWidth
          onClick={() => actions.apply(job)}
          disabled={isMutating || isApplied}
          isLoading={isMutating}
        >
          {isApplied ? t('jobs.applied') : t('jobs.apply')}
        </Button>
      </div>
    );

  return (
    <Drawer
      isOpen
      onClose={close}
      title={job?.title ?? t('common.loading')}
      closeLabel={t('detail.close')}
      {...(footer === undefined ? {} : { footer })}
      headerAside={
        match === null ? undefined : <MatchScore score={match.score} size={48} showLabel={false} />
      }
    >
      {status === 'loading' && job === null ? (
        <div>
          <Skeleton variant="block" height="70px" />
          <div style={{ blockSize: 'var(--space-4)' }} />
          <Skeleton count={6} />
        </div>
      ) : job === null ? (
        <EmptyState
          tone="danger"
          icon="!"
          title={t('detail.notFoundTitle')}
          body={t('detail.notFoundBody')}
          action={
            <Button variant="secondary" onClick={close}>
              {t('detail.backToJobs')}
            </Button>
          }
        />
      ) : (
        <>
          <div className={styles.head}>
            <span
              className={styles.logo}
              style={{ backgroundColor: job.company.logoColor }}
              aria-hidden="true"
            >
              {job.company.logoText}
            </span>
            <div className={styles.headBody}>
              <p className={styles.company}>{job.company.name}</p>
              <p className={styles.industry}>
                {job.company.industry} · {job.company.sizeRange}
              </p>
              {job.isPromoted ? <Badge tone="primary">{t('jobs.promoted')}</Badge> : null}
            </div>
          </div>

          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>{t('jobs.filterLocation')}</dt>
              <dd className={styles.factValue}>{job.location}</dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>{t('jobs.filterRemote')}</dt>
              <dd className={styles.factValue}>{t(REMOTE_LABEL[job.remoteMode])}</dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>{t('jobs.filterJobType')}</dt>
              <dd className={styles.factValue}>{t(JOB_TYPE_LABEL[job.jobType])}</dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>{t('jobs.filterSeniority')}</dt>
              <dd className={styles.factValue}>{t(SENIORITY_LABEL[job.seniority])}</dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>{t('jobs.filterSalaryMin')}</dt>
              <dd className={styles.factValue}>
                {job.salary === null
                  ? t('jobs.salaryUndisclosed')
                  : formatSalaryRange(locale, job.salary)}
              </dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>{t('jobs.postedRelative', { when: '' })}</dt>
              <dd className={styles.factValue}>
                {formatRelativeTime(locale, job.postedAt)} ·{' '}
                {tPlural('jobs.applicants', job.applicantsCount)}
              </dd>
            </div>
          </dl>

          {match === null ? null : (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>{t('detail.matchBreakdown')}</h3>
              <div className={styles.scoreHeader}>
                <MatchScore score={match.score} size={64} />
              </div>
              <div className={styles.reasons}>
                {match.reasons.map((reason) => (
                  <p key={`${reason.kind}-${reason.text}`} className={styles.reason}>
                    <span
                      className={cx(styles.reasonMark, REASON_CLASS[reason.impact])}
                      aria-hidden="true"
                    >
                      {REASON_MARK[reason.impact]}
                    </span>
                    {reason.text}
                  </p>
                ))}
              </div>
            </section>
          )}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('detail.skills')}</h3>

            {match === null ? (
              <div className={styles.skillRow}>
                {job.requiredSkills.map((skill) => (
                  <SkillTag key={skill.skillId} name={skill.name} />
                ))}
              </div>
            ) : (
              <>
                {match.matchingSkills.length === 0 ? null : (
                  <div className={cx(styles.skillRow, styles.skillGroup)}>
                    <span className={styles.skillRowLabel}>{t('jobs.matchingSkills')}</span>
                    {match.matchingSkills.map((skill) => (
                      <SkillTag key={skill.skillId} name={skill.name} variant="have" />
                    ))}
                  </div>
                )}
                {match.missingSkills.length === 0 ? null : (
                  <div className={styles.skillRow}>
                    <span className={styles.skillRowLabel}>{t('jobs.missingSkills')}</span>
                    {match.missingSkills.map((skill) => (
                      <SkillTag key={skill.skillId} name={skill.name} variant="missing" />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Listing text keeps the language it was posted in. */}
          <div data-content-dir={contentDir}>
            {job.contentLanguage === locale ? null : (
              <p className={styles.languageNote}>
                {t('detail.postedIn', {
                  language:
                    job.contentLanguage === 'he' ? t('detail.languageHe') : t('detail.languageEn'),
                })}
              </p>
            )}

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>{t('detail.about')}</h3>
              <p className={styles.body}>{job.description}</p>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>{t('detail.responsibilities')}</h3>
              <ul className={styles.bulletList}>
                {job.responsibilities.map((item) => (
                  <li key={item} className={styles.bullet}>
                    <span className={styles.bulletMark} aria-hidden="true">
                      •
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>{t('detail.requirements')}</h3>
              <ul className={styles.bulletList}>
                {job.requirements.map((item) => (
                  <li key={item} className={styles.bullet}>
                    <span className={styles.bulletMark} aria-hidden="true">
                      •
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {job.niceToHave.length === 0 ? null : (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>{t('detail.niceToHave')}</h3>
                <ul className={styles.bulletList}>
                  {job.niceToHave.map((item) => (
                    <li key={item} className={styles.bullet}>
                      <span className={styles.bulletMark} aria-hidden="true">
                        •
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <a
            className={styles.externalLink}
            href={job.externalUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            {t('detail.viewOriginal')}
            <span aria-hidden="true">↗</span>
          </a>
        </>
      )}
    </Drawer>
  );
};
