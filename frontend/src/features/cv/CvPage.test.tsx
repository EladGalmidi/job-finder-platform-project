import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { __setTransport } from '@/services/http/client';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ApiError, asCvId, asSkillId, asUserId } from '@/types';
import type { ApiResponse, CV, CVAnalysis, HttpTransport, RequestConfig } from '@/types';

import { CvPage } from './CvPage';

/**
 * The CV screen's score comes from the scoring service.
 *
 * Two things are asserted here. The first is that the number on the ring
 * arrived over HTTP from `/cv/:cvId/score` and is not the locally computed one.
 * The second matters just as much: everything else on the screen still reads
 * from the CV analysis and is still rendered. Only the score changed source.
 */

const cv: CV = {
  id: asCvId('cv-1'),
  userId: asUserId('user-1'),
  fileName: 'rin-kobayashi.pdf',
  fileSizeBytes: 51_200,
  mimeType: 'application/pdf',
  source: 'upload',
  uploadedAt: new Date('2026-09-01T10:00:00.000Z').toISOString(),
  status: 'ready',
};

/** The locally computed analysis. Its score is 77 — the value being replaced. */
const analysis: CVAnalysis = {
  id: 'analysis-cv-1',
  cvId: cv.id,
  score: 77,
  breakdown: [
    { key: 'structure', score: 70, weight: 0.15, summary: 'Four sections found.', tips: [] },
  ],
  detectedSkills: [{ skillId: asSkillId('sk-aws'), name: 'AWS' }],
  missingSkills: [
    {
      skillId: asSkillId('sk-go'),
      name: 'Go',
      demandPercent: 30,
      appearsInJobs: 6,
      priority: 'medium',
      learnEstimateWeeks: 4,
    },
  ],
  experienceYears: 7,
  seniorityEstimate: 'senior',
  keywords: { found: ['AWS'], missing: ['Go'] },
  recommendations: [
    { id: 'rec-1', severity: 'important', title: 'Quantify your outcomes', body: 'Add numbers.' },
  ],
  matchedJobsCount: 12,
  analyzedAt: new Date('2026-09-02T10:00:00.000Z').toISOString(),
};

/**
 * Answers the three endpoints the screen uses. `score` of null makes the score
 * endpoint 404, standing in for a CV the scoring service has not answered for.
 */
const backend = (score: number | null): { transport: HttpTransport; urls: string[] } => {
  const urls: string[] = [];

  const transport: HttpTransport = {
    request<T>({ url }: RequestConfig): Promise<ApiResponse<T>> {
      urls.push(url);

      if (url === '/cv/active') return Promise.resolve({ data: cv as T, status: 200 });
      if (url === '/cv/cv-1/analysis') return Promise.resolve({ data: analysis as T, status: 200 });

      if (url === '/cv/cv-1/score') {
        return score === null
          ? Promise.reject(new ApiError('NOT_FOUND', 'Score for cv-1 was not found', 404))
          : // Deliberately carries a field the frontend does not know about, the
            // way the real scoring service is expected to. Reading `score` off
            // the object has to keep working regardless.
            Promise.resolve({ data: { score, scoredAt: '2026-09-03T00:00:00.000Z' } as T, status: 200 });
      }

      throw new Error(`unexpected request: ${url}`);
    },
  };

  return { transport, urls };
};

/**
 * The ring's accessible value.
 *
 * Read from role="progressbar" rather than the visible digits: those are
 * animated by useCountUp and pass through every value on the way up, so an
 * assertion on the text is a race. aria-valuenow is the settled number.
 */
const ringValue = async (): Promise<string | null> =>
  (await screen.findByRole('progressbar', { name: 'Overall score' })).getAttribute('aria-valuenow');

const renderPage = (): void => {
  renderWithProviders(
    <MemoryRouter>
      <CvPage />
    </MemoryRouter>,
  );
};

afterEach(() => {
  __setTransport(null);
});

describe('CvPage score', () => {
  it('shows the score the backend returned, not the locally computed one', async () => {
    const { transport, urls } = backend(88);
    __setTransport(transport);
    renderPage();

    // 77 is the analysis score, and must not be what the ring settles on.
    await expect.poll(ringValue).toBe('88');
    expect(urls).toContain('/cv/cv-1/score');

    // The Match score row reads the same value.
    expect(screen.getByText('88%')).toBeInTheDocument();
  });

  it('shows a different backend score unchanged, proving it is not hardcoded', async () => {
    __setTransport(backend(41).transport);
    renderPage();

    await expect.poll(ringValue).toBe('41');
    expect(screen.getByText('41%')).toBeInTheDocument();
    expect(screen.queryByText('88%')).not.toBeInTheDocument();
  });

  it('falls back to the analysis score when the CV has not been scored yet', async () => {
    __setTransport(backend(null).transport);
    renderPage();

    // A 404 is an ordinary state. The ring keeps the number it already had
    // rather than blanking or dropping to zero.
    await expect.poll(ringValue).toBe('77');

    // And the Match score row is absent rather than showing a fake 0%.
    expect(screen.queryByText('Match score')).not.toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('still renders every other part of the screen', async () => {
    __setTransport(backend(88).transport);
    renderPage();

    await expect.poll(ringValue).toBe('88');

    // None of this changed source, and none of it may go missing. Collected
    // rather than asserted one by one, so a regression names what disappeared.
    const expected = [
      'Match score',
      'Overall score',
      'out of 100',
      'Years of experience',
      'Estimated level',
      'Score breakdown',
      'Download report',
      'Export JSON',
      'Share CV link',
      'Upload new CV',
    ];

    const missing = expected.filter((label) => screen.queryAllByText(label).length === 0);

    expect(missing).toEqual([]);

    // And the analysis-derived content is still on the page.
    expect(screen.getByText('Quantify your outcomes')).toBeInTheDocument();
    expect(screen.getAllByText('Go').length).toBeGreaterThan(0);
  });
});
