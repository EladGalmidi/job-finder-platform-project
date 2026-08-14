import { nowIso } from '@/lib/dates';
import type { CV, CvDocument } from '@/types';

import { detectExperienceYears, detectSkills } from './detectSkills';

/** Seniority read from the text, kept in step with the analysis builder. */
const seniorityFor = (years: number | null, text: string): CvDocument['parsed']['seniorityEstimate'] => {
  if (text.includes('principal') || text.includes('staff engineer')) return 'principal';
  if (text.includes('head of') || text.includes('team lead') || text.includes('tech lead')) return 'lead';
  if (years === null) return null;
  if (years >= 8) return 'principal';
  if (years >= 6) return 'lead';
  if (years >= 3) return 'senior';
  if (years >= 1) return 'mid';
  return 'junior';
};

const KEYWORD_LIMIT = 20;

/**
 * Reduces a stored CV to the machine-readable envelope another system can
 * ingest.
 *
 * Built here rather than in the UI because the raw text never leaves the
 * backend otherwise — and because a real deployment would produce this document
 * server-side, from the same text it parsed. The endpoint is what the UI sees.
 *
 * Fields this system cannot evidence from the text are left out rather than
 * guessed. There is no `work` or `education` array because employers, titles and
 * dates are not parsed; inventing empty-but-present structures would imply a
 * capability that does not exist.
 */
export const buildCvDocument = (cv: CV, text: string): CvDocument => {
  const normalised = text.toLowerCase();
  const skills = detectSkills(text);
  const years = detectExperienceYears(text);

  return {
    schemaVersion: '1.0',
    generatedAt: nowIso(),

    source: {
      cvId: cv.id,
      fileName: cv.fileName,
      fileSizeBytes: cv.fileSizeBytes,
      mimeType: cv.mimeType,
      uploadedAt: cv.uploadedAt,
    },

    extraction: {
      method: cv.fileName.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf-text-layer',
      // Page count belongs to the parse, not the stored CV, so it is only known
      // at upload time. Null rather than a made-up number.
      pages: null,
      characters: text.length,
    },

    content: { text },

    parsed: {
      skills: skills.map((skill) => ({
        id: skill.skillId,
        name: skill.name,
        level: skill.level ?? null,
      })),
      experienceYears: years,
      seniorityEstimate: seniorityFor(years, normalised),
      keywordsFound: skills.slice(0, KEYWORD_LIMIT).map((skill) => skill.name),
    },
  };
};
