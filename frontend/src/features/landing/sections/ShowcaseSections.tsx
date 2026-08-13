import { MatchScore } from '@/components/domain/MatchScore/MatchScore';
import { SectionHeading } from '@/components/ui/SectionHeading/SectionHeading';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';
import { scoreBandCssVar } from '@/lib/scoring';
import { scoreBand } from '@/lib/scoring';

import styles from '../Landing.module.css';

/** Illustrative marketing figures — copy, not data. */
const BREAKDOWN = [
  { key: 'cvSection.structure', score: 86 },
  { key: 'cvSection.skills', score: 71 },
  { key: 'cvSection.experience', score: 78 },
  { key: 'cvSection.keywords', score: 62 },
  { key: 'cvSection.impact', score: 64 },
] as const;

const MISSING = [
  { name: 'Next.js', demand: 52 },
  { name: 'GraphQL', demand: 41 },
  { name: 'Kubernetes', demand: 68 },
] as const;

const JOBS = [
  {
    logo: 'VA',
    color: '#15803d',
    title: 'Senior Frontend Engineer',
    meta: 'Verdant AI · Tel Aviv · Remote',
    score: 91,
    have: ['React', 'TypeScript', 'Accessibility'],
    missing: ['Next.js'],
  },
  {
    logo: 'PM',
    color: '#b45309',
    title: 'Frontend Developer',
    meta: 'PulseMetric · Tel Aviv · Hybrid',
    score: 68,
    have: ['React', 'Redux'],
    missing: ['D3', 'Performance profiling'],
  },
  {
    logo: 'NG',
    color: '#5c4ee5',
    title: 'Senior DevOps Engineer',
    meta: 'Nimbus Grid · Tel Aviv · Hybrid',
    score: 38,
    have: ['Docker'],
    missing: ['Kubernetes', 'Terraform', 'AWS'],
  },
] as const;

const STATS = [
  { value: '2,400+', labelKey: 'landing.stats.jobs' },
  { value: '180', labelKey: 'landing.stats.skills' },
  { value: '94%', labelKey: 'landing.stats.accuracy' },
  { value: '2 min', labelKey: 'landing.stats.time' },
] as const;

export const StatsBar = (): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <section className={styles.stats}>
      {STATS.map((stat) => (
        <div key={stat.labelKey} className={styles.stat}>
          <span className={styles.statValue}>{stat.value}</span>
          <span className={styles.statLabel}>{t(stat.labelKey)}</span>
        </div>
      ))}
    </section>
  );
};

export const HowItWorks = (): React.JSX.Element => {
  const { t } = useTranslation();

  const steps = [
    { title: t('landing.how.step1.title'), body: t('landing.how.step1.body') },
    { title: t('landing.how.step2.title'), body: t('landing.how.step2.body') },
    { title: t('landing.how.step3.title'), body: t('landing.how.step3.body') },
  ];

  return (
    <section id="how-it-works" className={styles.section} aria-labelledby="how-it-works-title">
      <SectionHeading
        centered
        id="how-it-works-title"
        eyebrow={t('landing.how.eyebrow')}
        title={t('landing.how.title')}
        subtitle={t('landing.how.subtitle')}
      />

      <div className={styles.steps}>
        {steps.map((step, index) => (
          <article key={step.title} className={styles.step}>
            <span className={styles.stepNumber} aria-hidden="true">
              {index + 1}
            </span>
            <h3 className={styles.stepTitle}>{step.title}</h3>
            <p className={styles.stepBody}>{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export const CvPreview = (): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className={styles.sectionAlt} id="insights">
      <section className={styles.sectionAltInner} aria-labelledby="cv-preview-title">
        <SectionHeading
          id="cv-preview-title"
          eyebrow={t('landing.cv.eyebrow')}
          title={t('landing.cv.title')}
          subtitle={t('landing.cv.subtitle')}
        />

        <div className={styles.split}>
          <div>
            <ul className={styles.pointList}>
              {[t('landing.cv.point1'), t('landing.cv.point2'), t('landing.cv.point3')].map(
                (point) => (
                  <li key={point} className={styles.point}>
                    <span className={styles.pointMark} aria-hidden="true">
                      ✓
                    </span>
                    {point}
                  </li>
                ),
              )}
            </ul>
          </div>

          <div className={styles.splitVisual}>
            <div className={styles.panel}>
              <div className={styles.cvHead}>
                <MatchScore score={74} size={84} showLabel={false} />
                <span className={styles.cvHeadMeta}>
                  <span className={styles.cvHeadLabel}>{t('landing.cv.overall')}</span>
                  <span className={styles.cvHeadValue}>74 / 100</span>
                </span>
              </div>

              <div className={styles.breakdown}>
                {BREAKDOWN.map((row) => (
                  <div key={row.key} className={styles.breakdownRow}>
                    <div className={styles.breakdownMeta}>
                      <span>{t(row.key)}</span>
                      <span className={styles.breakdownScore}>{row.score}</span>
                    </div>
                    {/*
                      Bars are decorative: the number beside each label already
                      carries the value, so the meter is hidden from the a11y tree.
                    */}
                    <div className={styles.meter} aria-hidden="true">
                      <div
                        className={styles.meterFill}
                        style={{
                          inlineSize: `${String(row.score)}%`,
                          backgroundColor: scoreBandCssVar(scoreBand(row.score)),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.missingList}>
                <h3 className={styles.missingTitle}>{t('landing.cv.missingTitle')}</h3>
                {MISSING.map((skill) => (
                  <div key={skill.name} className={styles.missingRow}>
                    <span>{skill.name}</span>
                    <span className={styles.missingDemand}>
                      {t('landing.cv.demand', { percent: skill.demand })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export const MatchPreview = (): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <section className={styles.section} aria-labelledby="match-preview-title">
      <SectionHeading
        id="match-preview-title"
        eyebrow={t('landing.match.eyebrow')}
        title={t('landing.match.title')}
        subtitle={t('landing.match.subtitle')}
      />

      <div className={cx(styles.split, styles.splitReverse)}>
        <div className={styles.splitVisual}>
          <div className={styles.jobList}>
            {JOBS.map((job) => (
              <article key={job.title} className={styles.jobCard}>
                <span
                  className={styles.jobLogo}
                  style={{ backgroundColor: job.color }}
                  aria-hidden="true"
                >
                  {job.logo}
                </span>

                <div className={styles.jobBody}>
                  <h3 className={styles.jobTitle}>{job.title}</h3>
                  <p className={styles.jobMeta}>{job.meta}</p>

                  <div className={styles.jobSkills}>
                    {job.have.map((skill) => (
                      <span key={skill} className={cx(styles.skillTag, styles.skillHave)}>
                        ✓ {skill}
                      </span>
                    ))}
                    {job.missing.map((skill) => (
                      <span key={skill} className={cx(styles.skillTag, styles.skillMissing)}>
                        ✕ {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <MatchScore score={job.score} size={56} showLabel={false} />
              </article>
            ))}
          </div>
        </div>

        <div>
          <ul className={styles.pointList}>
            <li className={styles.point}>
              <span className={styles.pointMark} aria-hidden="true">
                ✓
              </span>
              {t('landing.features.f1.body')}
            </li>
            <li className={styles.point}>
              <span className={styles.pointMark} aria-hidden="true">
                ✓
              </span>
              {t('landing.features.f2.body')}
            </li>
            <li className={styles.point}>
              <span className={styles.pointMark} aria-hidden="true">
                ✓
              </span>
              {t('landing.features.f5.body')}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};
