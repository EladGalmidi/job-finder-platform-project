import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button/Button';
import { FileDrop } from '@/components/ui/FileDrop/FileDrop';
import { ProgressRing } from '@/components/ui/ProgressRing/ProgressRing';
import { selectAutoExportJson, toastPushed } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/types';
import type { SerializedApiError } from '@/types';
import { ANALYSIS_STEP_LABEL } from '@/lib/labels';
import { cx } from '@/lib/cx';
import { ANALYSIS_STEPS, type CvId } from '@/types';

import {
  importCvFromLinkedin,
  selectActiveCv,
  selectUploadError,
  selectUploadStatus,
  uploadCv,
  uploadErrorCleared,
} from './cvSlice';
import { exportCvDocument } from './exportCvDocument';
import { useCvAnalysisRun } from './useCvAnalysisRun';
import styles from './CvUpload.module.css';

/**
 * Replacing the CV after onboarding.
 *
 * This exists because every "Upload new CV" control used to point at
 * /onboarding/cv, which the onboarding guard bounces straight back to the
 * dashboard for anyone who has finished onboarding — so the buttons did
 * nothing, and there was no way to change your CV at all.
 *
 * Upload and analysis are one route rather than two: the user asked to replace
 * their CV, and the progress is a step within that, not a separate destination
 * they should be able to land on.
 */
/**
 * Turns an upload failure into something the reader can act on.
 *
 * CV_NO_TEXT has two very different causes and the counts tell them apart: no
 * text blocks at all is a scan and nothing will extract it, whereas blocks that
 * yield no characters is a font-encoding gap on our side. Sending someone to
 * re-export a file that was never the problem wastes their time.
 */
const uploadErrorMessage = (
  error: SerializedApiError,
  t: ReturnType<typeof useTranslation>['t'],
): string => {
  if (error.code !== 'CV_NO_TEXT') return t(`error.${error.code}` as TranslationKey);

  const pages = error.details?.['pages'] ?? '0';
  const rawItems = error.details?.['rawItems'] ?? '0';

  // Runs present but undecodable is a font problem and ours to own. No runs at
  // all means there was never any text, and OCR has already been tried.
  return rawItems === '0'
    ? t('cv.noTextScan', { pages, rawItems })
    : t('cv.noTextEncoding', { pages, rawItems });
};

export const CvUploadPage = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const currentCv = useAppSelector(selectActiveCv);
  const autoExportJson = useAppSelector(selectAutoExportJson);
  const uploadStatus = useAppSelector(selectUploadStatus);
  const uploadError = useAppSelector(selectUploadError);

  const [file, setFile] = useState<File | null>(null);
  const [isLinkedinPending, setIsLinkedinPending] = useState(false);
  const [analysingCvId, setAnalysingCvId] = useState<CvId | null>(null);

  const isUploading = uploadStatus === 'loading';
  const isBusy = isUploading || isLinkedinPending;

  const { job, progressPercent } = useCvAnalysisRun({
    cvId: analysingCvId,
    onComplete: () => {
      // Exported against the id of the CV just analysed; the store may still be
      // holding the previous one at this point.
      if (autoExportJson && analysingCvId !== null) {
        void exportCvDocument(analysingCvId, file?.name ?? 'cv');
      }
      dispatch(toastPushed({ severity: 'success', title: t('cv.replaceDone') }));
      navigate('/dashboard/cv', { replace: true });
    },
  });

  const onAnalyse = (): void => {
    if (file === null) return;

    void dispatch(uploadCv(file)).then((result) => {
      if (uploadCv.fulfilled.match(result)) {
        setAnalysingCvId(result.payload.id);
      }
    });
  };

  const onLinkedin = (): void => {
    setIsLinkedinPending(true);
    void dispatch(importCvFromLinkedin()).then((result) => {
      setIsLinkedinPending(false);
      if (importCvFromLinkedin.fulfilled.match(result)) {
        setAnalysingCvId(result.payload.id);
      }
    });
  };

  if (analysingCvId !== null) {
    const currentStep = job?.currentStep ?? 'parsing';
    const completed = job?.completedSteps ?? [];

    return (
      <div className={styles.page}>
        <section className={cx(styles.panel, styles.analysing)}>
          <h2 className={styles.title}>{t('onboarding.analyzing.title')}</h2>
          <p className={styles.subtitle}>{t('onboarding.analyzing.subtitle')}</p>

          <ProgressRing value={progressPercent} size={132} thickness={12} label={t('onboarding.analyzing.title')}>
            <span className={styles.percent}>{progressPercent}%</span>
          </ProgressRing>

          <ol className={styles.steps}>
            {ANALYSIS_STEPS.map((step) => {
              const isDone = completed.includes(step);
              const isActive = !isDone && step === currentStep;
              return (
                <li
                  key={step}
                  className={cx(styles.step, isActive && styles.stepActive, isDone && styles.stepDone)}
                >
                  <span className={styles.stepMark} aria-hidden="true">
                    {isDone ? '✓' : ANALYSIS_STEPS.indexOf(step) + 1}
                  </span>
                  {t(ANALYSIS_STEP_LABEL[step])}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header>
        <h2 className={styles.title}>{t('cv.replaceTitle')}</h2>
        <p className={styles.subtitle}>{t('cv.replaceSubtitle')}</p>
      </header>

      <section className={styles.panel}>
        {currentCv === null ? null : (
          <p className={styles.currentCv}>{t('cv.replaceCurrent', { name: currentCv.fileName })}</p>
        )}

        <FileDrop
          file={file}
          onSelect={(next) => {
            // A new file means the previous failure no longer describes what is
            // on screen.
            dispatch(uploadErrorCleared());
            setFile(next);
          }}
          onClear={() => setFile(null)}
          disabled={isBusy}
          {...(uploadError === null
            ? {}
            : { externalError: uploadErrorMessage(uploadError, t) })}
        />

        <div className={styles.linkedinRow}>
          <Button
            variant="secondary"
            onClick={onLinkedin}
            isLoading={isLinkedinPending}
            disabled={isUploading}
          >
            {t('onboarding.cv.linkedin')}
          </Button>
          <span className={styles.note}>{t('onboarding.cv.linkedinNote')}</span>
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={() => navigate('/dashboard/cv')} disabled={isBusy}>
            {t('common.cancel')}
          </Button>
          <Button size="lg" onClick={onAnalyse} isLoading={isUploading} disabled={file === null}>
            {t('onboarding.cv.analyse')}
          </Button>
        </div>
      </section>
    </div>
  );
};
