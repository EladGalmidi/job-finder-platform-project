import { useCallback } from 'react';

import { useAppDispatch } from '@/app/hooks';
import { toastPushed } from '@/features/ui/uiSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { createLogger } from '@/lib/logger';

import { exportCvDocument } from './exportCvDocument';
import type { CV, CVAnalysis } from '@/types';

const log = createLogger('cvReport');

/** Minimal escaping — analysis text is not HTML and must not become HTML. */
const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export interface CvReportActions {
  download: () => void;
  share: () => void;
  /** Saves the CV as a machine-readable JSON document. */
  exportJson: () => Promise<void>;
}

/**
 * Report generation happens entirely client-side.
 *
 * The analysis is already in the store, so there is nothing a server would add.
 * The file is a self-contained HTML document, which prints to PDF from any
 * browser without pulling in a PDF library.
 */
export const useCvReport = (cv: CV | null, analysis: CVAnalysis | null): CvReportActions => {
  const dispatch = useAppDispatch();
  const { t, locale, localeTag } = useTranslation();

  const download = useCallback(() => {
    if (analysis === null) return;

    const generatedAt = new Intl.DateTimeFormat(localeTag, {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date());

    const rows = analysis.breakdown
      .map(
        (section) =>
          `<tr><td>${escapeHtml(section.key)}</td><td>${String(section.score)}</td><td>${escapeHtml(section.summary)}</td></tr>`,
      )
      .join('');

    const missing = analysis.missingSkills
      .map(
        (skill) =>
          `<li><strong>${escapeHtml(skill.name)}</strong> — ${String(skill.demandPercent)}% demand, ~${String(skill.learnEstimateWeeks)} weeks</li>`,
      )
      .join('');

    const recommendations = analysis.recommendations
      .map(
        (rec) =>
          `<li><strong>${escapeHtml(rec.title)}</strong> (${escapeHtml(rec.severity)})<br />${escapeHtml(rec.body)}</li>`,
      )
      .join('');

    const html = `<!doctype html>
<html lang="${locale}" dir="${locale === 'he' ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(t('cv.reportTitle'))}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 40px; color: #14172a; line-height: 1.6; }
  h1 { margin-bottom: 4px; }
  .meta { color: #5a6076; font-size: 14px; margin-bottom: 32px; }
  .score { font-size: 48px; font-weight: 700; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 32px; }
  th, td { border: 1px solid #e3e5ee; padding: 8px 12px; text-align: start; font-size: 14px; }
  th { background: #f1f2f7; }
  ul { padding-inline-start: 20px; }
  li { margin-bottom: 8px; font-size: 14px; }
</style>
</head>
<body>
  <h1>${escapeHtml(t('cv.reportTitle'))}</h1>
  <p class="meta">${escapeHtml(t('cv.reportGeneratedAt', { when: generatedAt }))}${
    cv === null ? '' : ` — ${escapeHtml(cv.fileName)}`
  }</p>

  <p class="score">${String(analysis.score)} / 100</p>

  <h2>${escapeHtml(t('cv.breakdownTitle'))}</h2>
  <table><thead><tr><th>Section</th><th>Score</th><th>Summary</th></tr></thead><tbody>${rows}</tbody></table>

  <h2>${escapeHtml(t('cv.missingTitle'))}</h2>
  <ul>${missing}</ul>

  <h2>${escapeHtml(t('cv.recommendationsTitle'))}</h2>
  <ul>${recommendations}</ul>
</body>
</html>`;

    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `jobmatch-cv-report-${analysis.cvId}.html`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      dispatch(toastPushed({ severity: 'success', title: t('cv.reportDownloaded') }));
    } catch (error) {
      log.error('report download failed', { error: String(error) });
      dispatch(toastPushed({ severity: 'danger', title: t('state.errorTitle') }));
    }
  }, [analysis, cv, dispatch, locale, localeTag, t]);

  const share = useCallback(() => {
    const url = `${window.location.origin}/dashboard/cv`;

    void navigator.clipboard
      .writeText(url)
      .then(() => {
        dispatch(toastPushed({ severity: 'info', title: t('cv.linkCopied') }));
      })
      .catch((error: unknown) => {
        log.warn('clipboard write failed', { error: String(error) });
        dispatch(toastPushed({ severity: 'danger', title: t('cv.linkCopyFailed') }));
      });
  }, [dispatch, t]);

  const exportJson = useCallback(async () => {
    if (cv === null) return;

    const ok = await exportCvDocument(cv.id, cv.fileName);
    dispatch(
      ok
        ? toastPushed({ severity: 'success', title: t('cv.exportJsonDone') })
        : toastPushed({ severity: 'danger', title: t('cv.exportJsonFailed') }),
    );
  }, [cv, dispatch, t]);

  return { download, share, exportJson };
};
