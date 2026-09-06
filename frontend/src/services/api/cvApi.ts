import type {
  AnalysisJob,
  AnalysisJobId,
  CV,
  CVAnalysis,
  CvDocument,
  CvId,
  CvScore,
} from '@/types';

import { api } from '../http/client';

export const cvApi = {
  upload: (file: File): Promise<CV> => api.post<CV>('/cv', undefined, { file }),

  importFromLinkedin: (): Promise<CV> => api.post<CV>('/cv/linkedin-import'),

  active: (signal?: AbortSignal): Promise<CV | null> =>
    api.get<CV | null>('/cv/active', signal === undefined ? undefined : { signal }),

  startAnalysis: (cvId: CvId): Promise<{ analysisJobId: AnalysisJobId }> =>
    api.post<{ analysisJobId: AnalysisJobId }>(`/cv/${cvId}/analyze`),

  /** Polled by the analysing step; cancellable so navigating away stops it. */
  pollAnalysis: (analysisJobId: AnalysisJobId, signal?: AbortSignal): Promise<AnalysisJob> =>
    api.get<AnalysisJob>(
      `/analysis-jobs/${analysisJobId}`,
      signal === undefined ? undefined : { signal },
    ),

  /** The CV as a machine-readable document, for export into another system. */
  document: (cvId: CvId, signal?: AbortSignal): Promise<CvDocument> =>
    api.get<CvDocument>(`/cv/${cvId}/document`, signal === undefined ? undefined : { signal }),

  analysis: (cvId: CvId, signal?: AbortSignal): Promise<CVAnalysis> =>
    api.get<CVAnalysis>(`/cv/${cvId}/analysis`, signal === undefined ? undefined : { signal }),

  /**
   * The CV's score, from the scoring service.
   *
   * 404s until that service has answered for this CV, which is an ordinary
   * state rather than an error — callers fall back to what they already show.
   */
  score: (cvId: CvId, signal?: AbortSignal): Promise<CvScore> =>
    api.get<CvScore>(`/cv/${cvId}/score`, signal === undefined ? undefined : { signal }),
};
