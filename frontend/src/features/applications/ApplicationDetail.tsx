import { useState } from 'react';

import { useAppDispatch } from '@/app/hooks';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog/ConfirmDialog';
import { LinkButton } from '@/components/ui/Button/LinkButton';
import { Drawer } from '@/components/ui/Drawer/Drawer';
import { Select } from '@/components/ui/Select/Select';
import { toastPushed } from '@/features/ui/uiSlice';
import { jobDetailPath } from '@/features/jobs/useJobActions';
import { useTranslation } from '@/i18n/useTranslation';
import { formatRelativeTime, formatSalaryRange } from '@/lib/format';
import { APPLICATION_STATUS_LABEL, APPLICATION_STATUS_TONE } from '@/lib/labels';
import { APPLICATION_STATUSES, type Application, type ApplicationStatus, type Job } from '@/types';

import {
  addApplicationNote,
  changeApplicationStatus,
  removeApplication,
} from './applicationsSlice';
import styles from './Applications.module.css';

export interface ApplicationDetailProps {
  readonly application: Application;
  readonly job: Job;
  readonly onClose: () => void;
}

export const ApplicationDetail = ({
  application,
  job,
  onClose,
}: ApplicationDetailProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { t, locale } = useTranslation();

  const [note, setNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const onStatusChange = (status: ApplicationStatus): void => {
    void dispatch(changeApplicationStatus({ id: application.id, status })).then((result) => {
      if (changeApplicationStatus.fulfilled.match(result)) {
        dispatch(
          toastPushed({
            severity: 'success',
            title: t('applications.statusChanged', {
              status: t(APPLICATION_STATUS_LABEL[status]),
            }),
          }),
        );
        return;
      }
      dispatch(toastPushed({ severity: 'danger', title: t('applications.actionFailed') }));
    });
  };

  const onAddNote = (): void => {
    const body = note.trim();
    if (body === '') return;

    setIsSavingNote(true);
    void dispatch(addApplicationNote({ id: application.id, body })).then((result) => {
      setIsSavingNote(false);
      if (addApplicationNote.fulfilled.match(result)) {
        setNote('');
        dispatch(toastPushed({ severity: 'success', title: t('applications.noteAdded') }));
        return;
      }
      dispatch(toastPushed({ severity: 'danger', title: t('applications.actionFailed') }));
    });
  };

  const onRemove = (): void => {
    setConfirmingRemove(false);
    setIsRemoving(true);
    void dispatch(removeApplication(application.id)).then((result) => {
      setIsRemoving(false);
      if (removeApplication.fulfilled.match(result)) {
        dispatch(toastPushed({ severity: 'info', title: t('applications.removed') }));
        onClose();
        return;
      }
      dispatch(toastPushed({ severity: 'danger', title: t('applications.actionFailed') }));
    });
  };

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={job.title}
      closeLabel={t('common.close')}
      headerAside={
        <Badge tone={APPLICATION_STATUS_TONE[application.status]}>
          {t(APPLICATION_STATUS_LABEL[application.status])}
        </Badge>
      }
      footer={
        <div className={styles.detailFooter}>
          <LinkButton to={jobDetailPath(job.id)} variant="secondary" fullWidth>
            {t('applications.viewJob')}
          </LinkButton>
          <Button variant="danger" onClick={() => setConfirmingRemove(true)} isLoading={isRemoving}>
            {t('applications.remove')}
          </Button>
        </div>
      }
    >
      <div className={styles.detailHead}>
        <span
          className={styles.logo}
          style={{ backgroundColor: job.company.logoColor }}
          aria-hidden="true"
        >
          {job.company.logoText}
        </span>
        <div>
          <p className={styles.rowTitle} style={{ position: 'static' }}>
            {job.company.name}
          </p>
          <p className={styles.rowMeta}>
            {job.location} ·{' '}
            {job.salary === null
              ? t('jobs.salaryUndisclosed')
              : formatSalaryRange(locale, job.salary)}
          </p>
        </div>
      </div>

      <section className={styles.detailSection}>
        <h3 className={styles.detailTitle}>{t('applications.changeStatus')}</h3>
        <Select
          hideLabel
          label={t('applications.changeStatus')}
          value={application.status}
          onChange={(event) => onStatusChange(event.target.value as ApplicationStatus)}
          options={APPLICATION_STATUSES.map((status) => ({
            value: status,
            label: t(APPLICATION_STATUS_LABEL[status]),
          }))}
        />
      </section>

      <section className={styles.detailSection}>
        <h3 className={styles.detailTitle}>{t('applications.timeline')}</h3>
        <div className={styles.timeline}>
          {application.timeline.map((event) => (
            <div key={event.id} className={styles.timelineItem}>
              <span className={styles.timelineDot} aria-hidden="true">
                ●
              </span>
              <span>
                <span className={styles.timelineText}>
                  {event.from === null
                    ? t('applications.timelineStart')
                    : t('applications.timelineFrom', {
                        from: t(APPLICATION_STATUS_LABEL[event.from]),
                        to: t(APPLICATION_STATUS_LABEL[event.to]),
                      })}
                </span>
                <span className={styles.timelineTime}>
                  {formatRelativeTime(locale, event.at)}
                  {event.note === undefined ? '' : ` · ${event.note}`}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.detailSection}>
        <h3 className={styles.detailTitle}>{t('applications.notes')}</h3>

        {application.notes.length === 0 ? (
          <p className={styles.emptyNote}>{t('applications.notesEmpty')}</p>
        ) : (
          <div className={styles.notes}>
            {application.notes.map((entry) => (
              <div key={entry.id} className={styles.note}>
                <p className={styles.noteBody}>{entry.body}</p>
                <p className={styles.noteTime}>{formatRelativeTime(locale, entry.at)}</p>
              </div>
            ))}
          </div>
        )}

        <div className={styles.noteForm}>
          <label htmlFor="application-note" className="visuallyHidden">
            {t('applications.addNote')}
          </label>
          <textarea
            id="application-note"
            className={styles.noteInput}
            placeholder={t('applications.notePlaceholder')}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Button
            size="sm"
            onClick={onAddNote}
            disabled={note.trim() === ''}
            isLoading={isSavingNote}
          >
            {t('applications.saveNote')}
          </Button>
        </div>
      </section>

      {/* Nested inside the drawer so the confirm sits above it; the drawer's own
          trap yields to this one while it is open, and Escape unwinds one layer
          at a time rather than closing both. */}
      <ConfirmDialog
        isOpen={confirmingRemove}
        title={t('applications.removeConfirmTitle')}
        body={t('applications.removeConfirm')}
        confirmLabel={t('applications.remove')}
        cancelLabel={t('common.cancel')}
        onConfirm={onRemove}
        onCancel={() => setConfirmingRemove(false)}
        isBusy={isRemoving}
      />
    </Drawer>
  );
};
