import { useAppDispatch } from '@/app/hooks';
import { MatchScore } from '@/components/domain/MatchScore/MatchScore';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Card, CardHeader } from '@/components/ui/Card/Card';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState/ErrorState';
import { Input } from '@/components/ui/Input/Input';
import { ProgressRing } from '@/components/ui/ProgressRing/ProgressRing';
import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { toastPushed } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';

import { MockControls } from './MockControls';
import styles from './DevUiPage.module.css';

const TONES = ['neutral', 'primary', 'success', 'warning', 'danger', 'info'] as const;

const COLOR_TOKENS = [
  '--color-primary',
  '--color-success',
  '--color-warning',
  '--color-danger',
  '--color-surface',
  '--color-surface-sunken',
  '--color-border',
  '--color-text',
] as const;

/**
 * Kitchen-sink route. Replaces Storybook (a heavy dependency) and hosts the mock
 * controls, so error and loading states are reachable without editing code.
 */
export const DevUiPage = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { t, tPlural } = useTranslation();

  return (
    <div className={styles.page}>
      <header>
        <h2 className={styles.title}>{t('dev.title')}</h2>
        <p className={styles.subtitle}>{t('dev.subtitle')}</p>
      </header>

      <MockControls />

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Colour tokens</h3>
        <div className={styles.grid}>
          {COLOR_TOKENS.map((token) => (
            <div key={token} className={styles.swatch}>
              <span className={styles.chip} style={{ backgroundColor: `var(${token})` }} />
              <code>{token}</code>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Buttons</h3>
        <div className={styles.row}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button isLoading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className={styles.row}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Badges</h3>
        <div className={styles.row}>
          {TONES.map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Match scores</h3>
        <div className={styles.row}>
          <MatchScore score={92} />
          <MatchScore score={68} />
          <MatchScore score={41} />
        </div>
        <p>{tPlural('jobs.count', 3)}</p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Progress and loading</h3>
        <div className={styles.row}>
          <ProgressRing value={74} label="CV score 74 out of 100" caption="CV score" />
          <Spinner size="lg" label={t('common.loading')} />
        </div>
        <div className={styles.stack}>
          <Skeleton count={3} />
          <Skeleton variant="block" height="80px" />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Form controls</h3>
        <div className={styles.stack}>
          <Input label="Email" type="email" placeholder="you@example.com" />
          <Input label="With hint" hint="Helper text sits under the field." />
          <Input label="With error" error="This field is required." defaultValue="bad value" />
          <Input label="Disabled" disabled defaultValue="Cannot edit" />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Toasts</h3>
        <div className={styles.row}>
          {(['info', 'success', 'warning', 'danger'] as const).map((severity) => (
            <Button
              key={severity}
              variant="secondary"
              onClick={() =>
                dispatch(
                  toastPushed({
                    severity,
                    title: `${severity} toast`,
                    message: 'Dismisses automatically after five seconds.',
                  }),
                )
              }
            >
              {severity}
            </Button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>States</h3>
        <Card padding="none">
          <EmptyState title={t('state.emptyTitle')} body={t('state.emptyBody')} icon="∅" />
        </Card>
        <Card padding="none">
          <ErrorState
            error={{ code: 'SERVER_ERROR', message: 'boom', status: 500 }}
            onRetry={() => undefined}
          />
        </Card>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Cards</h3>
        <div className={styles.grid}>
          <Card elevated>
            <CardHeader title="Elevated card" subtitle="With a subtitle" />
            <p>Body content.</p>
          </Card>
          <Card interactive>
            <CardHeader title="Interactive card" />
            <p>Hover to see the lift.</p>
          </Card>
        </div>
      </section>
    </div>
  );
};
