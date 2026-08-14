import { useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button/Button';
import { FileDrop } from '@/components/ui/FileDrop/FileDrop';
import { onboardingCvSet, onboardingCvSkipped } from '@/features/auth/authSlice';
import {
  importCvFromLinkedin,
  selectUploadError,
  selectUploadStatus,
  uploadCv,
  uploadErrorCleared,
} from '@/features/cv/cvSlice';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/types';

import { useOnboardingSteps } from '../useOnboardingSteps';
import styles from '../Onboarding.module.css';

/**
 * The selected `File` is held in component state, not Redux — a File is not
 * serialisable and only its metadata ever reaches the store.
 */
export const CvUploadStep = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { goTo } = useOnboardingSteps();

  const uploadStatus = useAppSelector(selectUploadStatus);
  const uploadError = useAppSelector(selectUploadError);

  const [file, setFile] = useState<File | null>(null);
  const [isLinkedinPending, setIsLinkedinPending] = useState(false);

  const isUploading = uploadStatus === 'loading';
  const isBusy = isUploading || isLinkedinPending;

  const onAnalyse = (): void => {
    if (file === null) return;

    void dispatch(uploadCv(file)).then((result) => {
      if (uploadCv.fulfilled.match(result)) {
        dispatch(onboardingCvSet(result.payload.id));
        goTo('analyzing');
      }
    });
  };

  const onLinkedin = (): void => {
    setIsLinkedinPending(true);
    void dispatch(importCvFromLinkedin()).then((result) => {
      setIsLinkedinPending(false);
      if (importCvFromLinkedin.fulfilled.match(result)) {
        dispatch(onboardingCvSet(result.payload.id));
        goTo('analyzing');
      }
    });
  };

  const onSkip = (): void => {
    dispatch(onboardingCvSkipped());
    goTo('results');
  };

  return (
    <section className={styles.card}>
      <h1 className={styles.stepTitle}>{t('onboarding.cv.title')}</h1>
      <p className={styles.stepSubtitle}>{t('onboarding.cv.subtitle')}</p>

      <div className={styles.fieldGroup}>
        <FileDrop
          file={file}
          onSelect={(next) => {
            dispatch(uploadErrorCleared());
            setFile(next);
          }}
          onClear={() => setFile(null)}
          disabled={isBusy}
          {...(uploadError === null
            ? {}
            : { externalError: t(`error.${uploadError.code}` as TranslationKey) })}
        />

        {file !== null && !isBusy ? (
          <p className={styles.uploadReady}>
            <span aria-hidden="true">✓</span>
            {t('onboarding.cv.uploaded')}
          </p>
        ) : null}
      </div>

      <div className={styles.cvActions}>
        <Button variant="secondary" onClick={onLinkedin} isLoading={isLinkedinPending} disabled={isUploading}>
          {t('onboarding.cv.linkedin')}
        </Button>
        <span className={styles.linkedinNote}>{t('onboarding.cv.linkedinNote')}</span>
      </div>

      <p className={styles.skipNote}>{t('onboarding.cv.skipNote')}</p>

      <div className={styles.actions}>
        <Button variant="ghost" onClick={() => goTo('preferences')} disabled={isBusy}>
          {t('common.back')}
        </Button>

        <div className={styles.actionsEnd}>
          <Button variant="ghost" onClick={onSkip} disabled={isBusy}>
            {t('onboarding.cv.skip')}
          </Button>
          <Button size="lg" onClick={onAnalyse} isLoading={isUploading} disabled={file === null}>
            {t('onboarding.cv.analyse')}
          </Button>
        </div>
      </div>
    </section>
  );
};
