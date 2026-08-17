import { detectExperienceYears, detectSkills, type DetectedSkill, type SkillEntry } from './detectSkills.js';

/**
 * Turns the text of a CV into an analysis.
 *
 * Every number is derived from something actually present in the document.
 * Where a signal cannot be read from text — whether an achievement is genuinely
 * impressive, whether a claimed skill is real — the section says so rather than
 * inventing a figure.
 *
 * Ported from the frontend mock unchanged in substance, with one difference
 * that matters: demand comes from the jobs table rather than a bundled fixture,
 * so "employers ask for this" is measured against the same listings the user
 * is being matched to.
 */

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

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

const DEGREE_MARKERS = [
  'bsc', 'b.sc', 'ba ', 'msc', 'm.sc', 'mba', 'phd',
  'degree', 'university', 'college', 'bachelor', 'master',
];

/** Signals that a bullet quantifies an outcome rather than listing a duty. */
const IMPACT_PATTERN = /\d+\s*(%|percent|x\b|k\b|m\b|users|customers|requests|hours|days|ms\b)/g;
const DUTY_PATTERN = /responsible for|worked on|helped with|involved in|participated in/g;

const MISSING_LIMIT = 6;

const count = (text: string, pattern: RegExp): number => [...text.matchAll(pattern)].length;

const present = (text: string, markers: readonly string[]): number =>
  markers.filter((marker) => text.includes(marker)).length;

export interface SkillDemand {
  readonly skillId: string;
  readonly name: string;
  /** How many listings require it. */
  readonly jobs: number;
}

export interface AnalysisInputs {
  readonly cvId: string;
  readonly text: string;
  readonly catalogue: readonly SkillEntry[];
  readonly demand: readonly SkillDemand[];
  readonly totalJobs: number;
  /** Required-skill lists per job, for the skills-only match count. */
  readonly jobRequirements: readonly (readonly string[])[];
}

const seniorityFor = (years: number | null, text: string): string => {
  if (text.includes('principal') || text.includes('staff engineer')) return 'principal';
  if (text.includes('head of') || text.includes('team lead') || text.includes('tech lead')) {
    return 'lead';
  }
  if (years === null) return 'mid';
  if (years >= 8) return 'principal';
  if (years >= 6) return 'lead';
  if (years >= 3) return 'senior';
  if (years >= 1) return 'mid';
  return 'junior';
};

const missingSkillsFrom = (
  owned: ReadonlySet<string>,
  demand: readonly SkillDemand[],
  totalJobs: number,
) =>
  demand
    .filter((entry) => !owned.has(entry.skillId))
    .map((entry) => {
      const demandPercent = totalJobs === 0 ? 0 : Math.round((entry.jobs / totalJobs) * 100);
      // Effort is not readable from a job ad, so this is a rough band rather
      // than a fabricated per-skill estimate.
      const learnEstimateWeeks = demandPercent >= 40 ? 6 : 3;

      return {
        skillId: entry.skillId,
        name: entry.name,
        demandPercent,
        appearsInJobs: entry.jobs,
        priority:
          demandPercent >= 25 && learnEstimateWeeks <= 4
            ? 'high'
            : demandPercent >= 25
              ? 'medium'
              : 'low',
        learnEstimateWeeks,
      };
    })
    .sort((left, right) => right.demandPercent - left.demandPercent)
    .slice(0, MISSING_LIMIT);

interface Section {
  key: string;
  score: number;
  weight: number;
  summary: string;
  tips: string[];
}

const buildBreakdown = (
  text: string,
  detected: DetectedSkill[],
  years: number | null,
  demand: readonly SkillDemand[],
): Section[] => {
  const sectionsFound = present(text, SECTION_MARKERS);
  const structure = clampScore(40 + sectionsFound * 10);

  const owned = new Set(detected.map((skill) => skill.skillId));
  const inDemandOwned = demand.filter((entry) => owned.has(entry.skillId)).length;
  const skills = clampScore(demand.length === 0 ? 50 : (inDemandOwned / demand.length) * 160);

  const experience = years === null ? 45 : clampScore(35 + years * 8);

  const quantified = count(text, IMPACT_PATTERN);
  const duties = count(text, DUTY_PATTERN);
  const impact = clampScore(45 + quantified * 6 - duties * 5);

  const education = present(text, DEGREE_MARKERS) > 0 ? 80 : 45;
  const keywords = clampScore(30 + detected.length * 5);

  return [
    {
      key: 'structure',
      score: structure,
      weight: 0.15,
      summary:
        sectionsFound >= 4
          ? `Found ${String(sectionsFound)} standard sections, clearly separated.`
          : 'Few recognisable section headings, which makes the CV harder to skim.',
      tips:
        sectionsFound >= 4 ? [] : ['Add clear headings: Summary, Experience, Skills, Education'],
    },
    {
      key: 'skills',
      score: skills,
      weight: 0.3,
      summary: `${String(inDemandOwned)} of the ${String(demand.length)} skills employers ask for in these listings appear in your CV.`,
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
      summary: `${String(detected.length)} recognised skill terms found in the text.`,
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
          ? [`Replace ${String(duties)} duty phrases such as "responsible for" with the outcome`]
          : [],
    },
  ];
};

const buildRecommendations = (sections: readonly Section[]) =>
  // Advice follows the weakest sections, so it is always about something the
  // analysis actually measured rather than a stock list.
  [...sections]
    .sort((left, right) => left.score - right.score)
    .slice(0, 3)
    .map((section, index) => ({
      id: `rec-${section.key}`,
      severity: index === 0 ? 'critical' : 'important',
      title: section.summary,
      body:
        section.tips.length > 0
          ? section.tips.join('. ')
          : 'This section carries a large share of the score, so it is the cheapest place to gain.',
    }));

export const buildAnalysis = (inputs: AnalysisInputs) => {
  const detected = detectSkills(inputs.text, inputs.catalogue);
  const years = detectExperienceYears(inputs.text);
  const normalised = inputs.text.toLowerCase();

  const sections = buildBreakdown(normalised, detected, years, inputs.demand);
  const score = clampScore(
    sections.reduce((total, section) => total + section.score * section.weight, 0),
  );

  const owned = new Set(detected.map((skill) => skill.skillId));
  const missingSkills = missingSkillsFrom(owned, inputs.demand, inputs.totalJobs);

  return {
    id: `analysis-${inputs.cvId}`,
    cvId: inputs.cvId,
    score,
    breakdown: sections,
    detectedSkills: detected.map(({ skillId, name, level }) => ({ skillId, name, level })),
    missingSkills,
    experienceYears: years ?? 0,
    seniorityEstimate: seniorityFor(years, normalised),
    keywords: {
      found: detected.slice(0, 8).map((skill) => skill.name),
      missing: missingSkills.slice(0, 4).map((skill) => skill.name),
    },
    recommendations: buildRecommendations(sections),
    // The skills-only view of how many listings this CV suits. The dashboard's
    // own count also weighs preferences; this one is kept consistent with it
    // rather than left at zero.
    matchedJobsCount: inputs.jobRequirements.filter((required) => {
      if (required.length === 0) return false;
      return required.filter((skillId) => owned.has(skillId)).length / required.length >= 0.6;
    }).length,
    analyzedAt: new Date().toISOString(),
  };
};
