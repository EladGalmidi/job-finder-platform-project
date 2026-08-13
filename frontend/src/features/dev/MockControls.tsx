import { useState } from 'react';

import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Card, CardHeader } from '@/components/ui/Card/Card';
import { mockDb } from '@/mocks/db/mockDb';
import { faults, type FaultConfig } from '@/mocks/transport/faults';
import { useTranslation } from '@/i18n/useTranslation';

import styles from './DevUiPage.module.css';

interface FaultOption {
  readonly label: string;
  readonly config: FaultConfig | null;
}

const OPTIONS: readonly FaultOption[] = [
  { label: 'None', config: null },
  { label: '500 Server error', config: { code: 'SERVER_ERROR', status: 500 } },
  { label: '401 Unauthorized', config: { code: 'UNAUTHORIZED', status: 401 } },
  { label: '404 Not found', config: { code: 'NOT_FOUND', status: 404 } },
  { label: 'Network error', config: { code: 'NETWORK_ERROR', status: 0 } },
  { label: 'Timeout', config: { code: 'TIMEOUT', status: 0 } },
  { label: '500 on /jobs only', config: { code: 'SERVER_ERROR', status: 500, urlContains: '/jobs' } },
];

/**
 * Drives the mock transport directly.
 *
 * Error states only get built when they are trivial to reproduce; this is how a
 * 500 or a stale session is produced on demand instead of by editing fixtures.
 */
export const MockControls = (): React.JSX.Element => {
  const { t } = useTranslation();
  const [activeLabel, setActiveLabel] = useState('None');

  const apply = (option: FaultOption): void => {
    faults.set(option.config);
    setActiveLabel(option.label);
  };

  return (
    <Card>
      <CardHeader
        title="Mock controls"
        subtitle="Development only — not included in production builds."
        action={<Badge tone={activeLabel === 'None' ? 'neutral' : 'danger'}>{activeLabel}</Badge>}
      />

      <div className={styles.section}>
        <div>
          <p>{t('dev.faults')}</p>
          <div className={styles.row}>
            {OPTIONS.map((option) => (
              <Button
                key={option.label}
                size="sm"
                variant={activeLabel === option.label ? 'primary' : 'secondary'}
                onClick={() => apply(option)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              mockDb.reset();
              window.location.reload();
            }}
          >
            {t('dev.resetDb')}
          </Button>
        </div>
      </div>
    </Card>
  );
};
