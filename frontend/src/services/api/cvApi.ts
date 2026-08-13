import type { AnalysisJob, AnalysisJobId, CV, CVAnalysis, CvId } from '@/types';

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

  analysis: (cvId: CvId, signal?: AbortSignal): Promise<CVAnalysis> =>
    api.get<CVAnalysis>(`/cv/${cvId}/analysis`, signal === undefined ? undefined : { signal }),
};
