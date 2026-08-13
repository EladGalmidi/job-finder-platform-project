import { useCallback, useId, useRef, useState, type DragEvent } from 'react';

import { Button } from '@/components/ui/Button/Button';
import { useTranslation } from '@/i18n/useTranslation';
import { cx } from '@/lib/cx';
import { formatFileSize } from '@/lib/format';
import {
  ACCEPTED_CV_EXTENSIONS,
  checkCvFile,
  type CvFileRejection,
} from '@/lib/validation';

import styles from './FileDrop.module.css';

export interface FileDropProps {
  readonly file: File | null;
  readonly onSelect: (file: File) => void;
  readonly onClear: () => void;
  readonly disabled?: boolean;
  /** Server-side rejection, shown alongside client-side validation errors. */
  readonly externalError?: string;
}

const extensionLabel = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? 'FILE' : name.slice(dot + 1).toUpperCase();
};

/**
 * Drag-and-drop plus file picker with client-side validation.
 *
 * Validation runs here as well as in the mock handler: the same `checkCvFile`
 * rules are shared, so a file can never pass locally and be rejected remotely
 * for a different reason.
 */
export const FileDrop = ({
  file,
  onSelect,
  onClear,
  disabled = false,
  externalError,
}: FileDropProps): React.JSX.Element => {
  const { t, locale } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rejection, setRejection] = useState<CvFileRejection | null>(null);
  const errorId = useId();

  const accept = (candidate: File | undefined): void => {
    if (candidate === undefined) return;

    const result = checkCvFile(candidate);
    if (!result.ok) {
      setRejection(result.reason ?? 'UNSUPPORTED_FILE_TYPE');
      return;
    }

    setRejection(null);
    onSelect(candidate);
  };

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      accept(event.dataTransfer.files[0]);
    },
    // `accept` is stable enough for this component's lifetime; disabled is the
    // only value that changes behaviour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled],
  );

  const errorMessage =
    externalError ??
    (rejection === null
      ? undefined
      : rejection === 'FILE_TOO_LARGE'
        ? t('error.FILE_TOO_LARGE')
        : t('error.UNSUPPORTED_FILE_TYPE'));

  if (file !== null) {
    return (
      <div>
        <div className={styles.file}>
          <span className={styles.fileIcon} aria-hidden="true">
            {extensionLabel(file.name)}
          </span>
          <span className={styles.fileMeta}>
            <span className={styles.fileName}>{file.name}</span>
            <span className={styles.fileSize}>{formatFileSize(locale, file.size)}</span>
          </span>
          <button
            type="button"
            className={styles.fileRemove}
            onClick={onClear}
            aria-label={t('onboarding.cv.removeFile')}
            disabled={disabled}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <p className={styles.previewNote}>{t('onboarding.cv.previewNote')}</p>
      </div>
    );
  }

  return (
    <div>
      {/*
        The zone is a drop target, not a control: the button inside it is the
        keyboard-accessible path, so the div needs no tabindex or key handler.
      */}
      <div
        className={cx(
          styles.zone,
          isDragging && styles.active,
          errorMessage !== undefined && styles.invalid,
        )}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <span className={styles.icon} aria-hidden="true">
          ↑
        </span>
        <span className={styles.title}>
          {isDragging ? t('onboarding.cv.dropActive') : t('onboarding.cv.dropTitle')}
        </span>
        <span className={styles.or}>{t('onboarding.cv.dropOr')}</span>

        <Button
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          {...(errorMessage === undefined ? {} : { 'aria-describedby': errorId })}
        >
          {t('onboarding.cv.browse')}
        </Button>

        <span className={styles.constraints}>{t('onboarding.cv.constraints')}</span>

        <input
          ref={inputRef}
          type="file"
          className={styles.hiddenInput}
          accept={ACCEPTED_CV_EXTENSIONS.join(',')}
          disabled={disabled}
          onChange={(event) => {
            accept(event.target.files?.[0]);
            // Reset so selecting the same file twice still fires change.
            event.target.value = '';
          }}
          aria-label={t('onboarding.cv.browse')}
        />
      </div>

      {errorMessage === undefined ? null : (
        <p id={errorId} className={styles.error} role="alert">
          <span aria-hidden="true">⚠</span>
          {errorMessage}
        </p>
      )}
    </div>
  );
};
