import { Link } from 'react-router-dom';

import { MatchScore } from '@/components/domain/MatchScore/MatchScore';
import { SkillOverflow, SkillTag } from '@/components/domain/SkillTag/SkillTag';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';
import { formatRelativeTime, formatSalaryRange } from '@/lib/format';
import { JOB_TYPE_LABEL, REMOTE_LABEL } from '@/lib/labels';
import type { ApplicationStatus, Job, JobMatch } from '@/types';

import styles from './JobCard.module.css';

export interface JobCardProps {
  readonly job: Job;
  readonly match: JobMatch | null;
  /** Null when the user has no record for this job. */
  readonly status: ApplicationStatus | null;
  readonly isMutating: boolean;
  readonly detailPath: string;
  /** Toggles saved state. The caller owns which direction that means. */
  readonly onSave: () => void;
  readonly onApply: () => void;
  readonly onShare: () => void;
  /** Trims the skill rows on dense surfaces such as the dashboard. */
  readonly compact?: boolean;
}

const MAX_SKILLS = 4;

export const JobCard = ({
  job,
  match,
  status,
  isMutating,
  detailPath,
  onSave,
  onApply,
  onShare,
  compact = false,
}: JobCardProps): React.JSX.Element => {
  const { t, tPlural, locale } = useTranslation();

  const isSaved = status !== null;
  const isApplied = status !== null && status !== 'saved';

  // Unsaving is only meaningful while the record is still just a save. Once the
  // user has applied it carries a timeline and notes, and discarding that
  // belongs behind the confirmation on the applications page.
  const canToggleSave = status === null || status === 'saved';

  const matching = match?.matchingSkills ?? [];
  const missing = match?.missingSkills ?? [];
  const limit = compact ? 3 : MAX_SKILLS;

  // Listings keep the language they were posted in, so the text block carries
  // its own direction rather than inheriting the UI locale.
  const contentDir = job.contentLanguage === 'he' ? 'rtl' : 'ltr';

  return (
    <article className={cx(styles.card, styles.cardRelative)}>
      <div className={styles.head}>
        <span
          className={styles.logo}
          style={{ backgroundColor: job.company.logoColor }}
          aria-hidden="true"
        >
          {job.company.logoText}
        </span>

        <div className={cx(styles.headBody, styles.contentBlock)} data-content-dir={contentDir}>
          <div className={styles.titleRow}>
            <Link to={detailPath} className={cx(styles.title, styles.titleLink)}>
              {job.title}
            </Link>
            {job.isPromoted ? <Badge tone="primary">{t('jobs.promoted')}</Badge> : null}
            {isApplied ? (
              <Badge tone="success" icon="✓">
                {t('jobs.applied')}
              </Badge>
            ) : null}
          </div>

          <p className={styles.company}>{job.company.name}</p>

          <div className={styles.meta}>
            <span className={styles.metaItem}>
              <span aria-hidden="true">📍</span>
              {job.location}
            </span>
            <span className={styles.metaItem}>{t(REMOTE_LABEL[job.remoteMode])}</span>
            <span className={styles.metaItem}>{t(JOB_TYPE_LABEL[job.jobType])}</span>
            <span className={cx(styles.metaItem, styles.salary)}>
              {job.salary === null
                ? t('jobs.salaryUndisclosed')
                : formatSalaryRange(locale, job.salary)}
            </span>
            <span className={styles.metaItem}>
              {t('jobs.postedRelative', { when: formatRelativeTime(locale, job.postedAt) })}
            </span>
            {compact ? null : (
              <span className={styles.metaItem}>
                {tPlural('jobs.applicants', job.applicantsCount)}
              </span>
            )}
          </div>
        </div>

        {match === null ? null : (
          <div className={styles.score}>
            <MatchScore score={match.score} size={56} showLabel={false} />
          </div>
        )}
      </div>

      <div className={styles.skills}>
        {matching.length === 0 ? null : (
          <div className={styles.skillGroup}>
            <span className={styles.skillLabel}>{t('jobs.matchingSkills')}</span>
            {matching.slice(0, limit).map((skill) => (
              <SkillTag key={skill.skillId} name={skill.name} variant="have" />
            ))}
            {matching.length > limit ? <SkillOverflow count={matching.length - limit} /> : null}
          </div>
        )}

        {missing.length === 0 ? null : (
          <div className={styles.skillGroup}>
            <span className={styles.skillLabel}>{t('jobs.missingSkills')}</span>
            {missing.slice(0, limit).map((skill) => (
              <SkillTag key={skill.skillId} name={skill.name} variant="missing" />
            ))}
            {missing.length > limit ? <SkillOverflow count={missing.length - limit} /> : null}
          </div>
        )}

        {match === null ? (
          <div className={styles.skillGroup}>
            <span className={styles.skillLabel}>{t('jobs.requiredSkills')}</span>
            {job.requiredSkills.slice(0, limit).map((skill) => (
              <SkillTag key={skill.skillId} name={skill.name} />
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.actions}>
        {/* Once applied there is nothing left for this control to do, and a
            permanently greyed star reads as a broken button rather than a
            state. "Applied" already says the job is on the list. */}
        {canToggleSave ? (
          <Button
            size="sm"
            variant={isSaved ? 'secondary' : 'ghost'}
            onClick={onSave}
            disabled={isMutating}
            aria-pressed={isSaved}
            iconStart={<span aria-hidden="true">{isSaved ? '★' : '☆'}</span>}
          >
            {isSaved ? t('jobs.saved') : t('jobs.save')}
          </Button>
        ) : null}

        <Button
          size="sm"
          variant="ghost"
          onClick={onShare}
          iconStart={<span aria-hidden="true">↗</span>}
        >
          {t('jobs.share')}
        </Button>

        <span className={styles.spacer} />

        <Button
          size="sm"
          onClick={onApply}
          isComplete={isApplied}
          disabled={isMutating}
          isLoading={isMutating}
          {...(isApplied ? { iconStart: <span aria-hidden="true">✓</span> } : {})}
        >
          {isApplied ? t('jobs.applied') : t('jobs.apply')}
        </Button>
      </div>
    </article>
  );
};
