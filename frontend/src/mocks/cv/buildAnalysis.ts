import { nowIso } from '@/lib/dates';
import { clampScore } from '@/lib/scoring';
import type {
  CV,
  CVAnalysis,
  CVScoreSection,
  MissingSkill,
  Recommendation,
  Seniority,
  SkillId,
} from '@/types';

import { JOBS } from '../data/jobs';
import { detectExperienceYears, detectSkills, type DetectedSkill } from './detectSkills';

/**
 * Turns the text of a CV into an analysis.
 *
 * Every number here is derived from something actually present in the document.
 * Where a signal cannot be read from text — whether an achievement is truly
 * impressive, whether a claimed skill is real — the section says so rather than
 * inventing a figure. The previous version returned a fixed fixture whatever you
 * uploaded, which told people their CV was missing skills it plainly listed.
 */

/** Section headings a reader expects to find, used to score structure. */
const SECTION_MARKERS = [
  'experience',
  'education',
  'skills',
  'summary',
  'projects',
  'employment',
  'profile',
];

const DEGREE_MARKERS = ['bsc', 'b.sc', 'ba ', 'msc', 'm.sc', 'mba', 'phd', 'degree', 'university', 'college', 'bachelor', 'master'];

/** Signals that a bullet quantifies its outcome rather than listing a duty. */
const IMPACT_PATTERN = /\d+\s*(%|percent|x\b|k\b|m\b|users|customers|requests|hours|days|ms\b)/g;
const DUTY_PATTERN = /responsible for|worked on|helped with|involved in|participated in/g;

const count = (text: string, pattern: RegExp): number => [...text.matchAll(pattern)].length;

const present = (text: string, markers: readonly string[]): number =>
  markers.filter((marker) => text.includes(marker)).length;

/**
 * How often each skill is asked for across the catalogue.
 *
 * This is what makes "missing" mean something: a skill is only worth flagging if
 * employers are actually asking for it.
 */
const demandBySkill = (): Map<SkillId, { name: string; jobs: number }> => {
  const demand = new Map<SkillId, { name: string; jobs: number }>();

  for (const job of JOBS) {
    for (const skill of job.requiredSkills) {
      const entry = demand.get(skill.skillId);
      if (entry === undefined) demand.set(skill.skillId, { name: skill.name, jobs: 1 });
      else entry.jobs += 1;
    }
  }

  return demand;
};

const seniorityFor = (years: number | null, text: string): Seniority => {
  if (text.includes('principal') || text.includes('staff engineer')) return 'principal';
  if (text.includes('head of') || text.includes('team lead') || text.includes('tech lead')) return 'lead';
  if (years === null) return 'mid';
  if (years >= 8) return 'principal';
  if (years >= 6) return 'lead';
  if (years >= 3) return 'senior';
  if (years >= 1) return 'mid';
  return 'junior';
};

const MISSING_LIMIT = 6;

const missingSkillsFrom = (owned: Set<SkillId>): MissingSkill[] => {
  const demand = demandBySkill();
  const totalJobs = JOBS.length;

  return [...demand.entries()]
    .filter(([skillId]) => !owned.has(skillId))
    .map(([skillId, entry]) => {
      const demandPercent = Math.round((entry.jobs / totalJobs) * 100);
      // Effort is not readable from a job ad, so it is a rough constant band
      // rather than a fabricated per-skill estimate.
      const learnEstimateWeeks = demandPercent >= 40 ? 6 : 3;

      return {
        skillId,
        name: entry.name,
        demandPercent,
        appearsInJobs: entry.jobs,
        priority:
          demandPercent >= 25 && learnEstimateWeeks <= 4
            ? ('high' as const)
            : demandPercent >= 25
              ? ('medium' as const)
              : ('low' as const),
        learnEstimateWeeks,
      };
    })
    .sort((left, right) => right.demandPercent - left.demandPercent)
    .slice(0, MISSING_LIMIT);
};

const buildBreakdown = (
  text: string,
  detected: DetectedSkill[],
  years: number | null,
): CVScoreSection[] => {
  const sectionsFound = present(text, SECTION_MARKERS);
  const structure = clampScore(40 + sectionsFound * 10);

  // Skill coverage against what the catalogue actually asks for.
  const demand = demandBySkill();
  const owned = new Set(detected.map((skill) => skill.skillId));
  const inDemandOwned = [...demand.keys()].filter((id) => owned.has(id)).length;
  const skills = clampScore(demand.size === 0 ? 50 : (inDemandOwned / demand.size) * 160);

  const experience = years === null ? 45 : clampScore(35 + years * 8);

  const quantified = count(text, IMPACT_PATTERN);
  const duties = count(text, DUTY_PATTERN);
  const impact = clampScore(45 + quantified * 6 - duties * 5);

  const education = present(text, DEGREE_MARKERS) > 0 ? 80 : 45;

  const keywordHits = detected.length;
  const keywords = clampScore(30 + keywordHits * 5);

  return [
    {
      key: 'structure',
      score: structure,
      weight: 0.15,
      summary:
        sectionsFound >= 4
          ? `Found ${String(sectionsFound)} standard sections, clearly separated.`
          : 'Few recognisable section headings, which makes the CV harder to skim.',
      tips: sectionsFound >= 4 ? [] : ['Add clear headings: Summary, Experience, Skills, Education'],
    },
    {
      key: 'skills',
      score: skills,
      weight: 0.3,
      summary: `${String(inDemandOwned)} of the ${String(demand.size)} skills employers ask for in this catalogue appear in your CV.`,
      tips: [],
    },
    {
      key: 'experience',
      score: experience,
      weight: 0.25,
      summary:
        years === null
          ? 'No explicit number of years found. Recruiters scan for it first.'
          : `${String(years)} years stated.`,
      tips: years === null ? ['State your years of experience in the summary line'] : [],
    },
    {
      key: 'keywords',
      score: keywords,
      weight: 0.15,
      summary: `${String(keywordHits)} recognised skill terms found in the text.`,
      tips: [],
    },
    {
      key: 'education',
      score: education,
      weight: 0.05,
      summary: education >= 80 ? 'Education section detected.' : 'No education section detected.',
      tips: education >= 80 ? [] : ['Add an education line, even if brief'],
    },
    {
      key: 'impact',
      score: impact,
      weight: 0.1,
      summary:
        quantified === 0
          ? 'No quantified outcomes found — no numbers, percentages or volumes.'
          : `${String(quantified)} quantified results found.`,
      tips:
        duties > 0
          ? [`Replace "${String(duties)}" duty phrases such as "responsible for" with the outcome`]
          : [],
    },
  ];
};

const buildRecommendations = (sections: CVScoreSection[]): Recommendation[] =>
  // Advice follows the weakest sections, so it is always about something the
  // analysis actually measured rather than a stock list.
  [...sections]
    .sort((left, right) => left.score - right.score)
    .slice(0, 3)
    .map((section, index) => ({
      id: `rec-${section.key}`,
      severity: index === 0 ? ('critical' as const) : ('important' as const),
      title: section.summary,
      body:
        section.tips.length > 0
          ? section.tips.join('. ')
          : 'This section carries a large share of the score, so it is the cheapest place to gain.',
    }));

export interface AnalysisFromText {
  readonly analysis: CVAnalysis;
  /** False when no text could be read, so callers can say so plainly. */
  readonly hasText: boolean;
}

export const buildAnalysisFromText = (cv: CV, text: string): AnalysisFromText => {
  const detected = detectSkills(text);
  const years = detectExperienceYears(text);
  const normalised = text.toLowerCase();

  const sections = buildBreakdown(normalised, detected, years);
  const score = clampScore(
    sections.reduce((total, section) => total + section.score * section.weight, 0),
  );

  const owned = new Set(detected.map((skill) => skill.skillId));
  const missingSkills = missingSkillsFrom(owned);

  const analysis: CVAnalysis = {
    id: `analysis-${cv.id}`,
    cvId: cv.id,
    score,
    breakdown: sections,
    detectedSkills: detected.map(({ skillId, name, level }) => ({ skillId, name, ...(level === undefined ? {} : { level }) })),
    missingSkills,
    experienceYears: years ?? 0,
    seniorityEstimate: seniorityFor(years, normalised),
    keywords: {
      found: detected.slice(0, 8).map((skill) => skill.name),
      missing: missingSkills.slice(0, 4).map((skill) => skill.name),
    },
    recommendations: buildRecommendations(sections),
    // The dashboard reads its match count from the metrics endpoint, which
    // scores against preferences too. This is the skills-only view, kept
    // consistent rather than left at zero.
    matchedJobsCount: JOBS.filter((job) => {
      if (job.requiredSkills.length === 0) return false;
      const hit = job.requiredSkills.filter((skill) => owned.has(skill.skillId)).length;
      return hit / job.requiredSkills.length >= 0.6;
    }).length,
    analyzedAt: nowIso(),
  };

  return { analysis, hasText: text.trim() !== '' };
};
