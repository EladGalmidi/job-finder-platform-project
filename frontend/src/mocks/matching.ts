import { nowIso } from '@/lib/dates';
import { hashString } from '@/lib/random';
import { clampScore } from '@/lib/scoring';
import type { Job, JobMatch, MatchReason, SkillRef, UserPreferences } from '@/types';

/**
 * The stand-in for the scoring service.
 *
 * Deliberately deterministic: the same CV and job always produce the same score,
 * so demos are repeatable and tests can assert exact numbers. This lives in the
 * mock layer because a real backend will own it — the UI only ever consumes the
 * resulting JobMatch.
 */

const WEIGHTS = {
  skills: 0.6,
  seniority: 0.15,
  location: 0.12,
  salary: 0.08,
  role: 0.05,
} as const;

const SENIORITY_ORDER = ['junior', 'mid', 'senior', 'lead', 'principal'] as const;

const seniorityDistance = (a: string, b: string): number => {
  const left = SENIORITY_ORDER.indexOf(a as (typeof SENIORITY_ORDER)[number]);
  const right = SENIORITY_ORDER.indexOf(b as (typeof SENIORITY_ORDER)[number]);
  if (left < 0 || right < 0) return 2;
  return Math.abs(left - right);
};

export interface MatchInput {
  readonly job: Job;
  readonly userSkills: readonly SkillRef[];
  readonly preferences: UserPreferences | null;
}

export const computeMatch = ({ job, userSkills, preferences }: MatchInput): JobMatch => {
  const owned = new Set(userSkills.map((skill) => skill.skillId));

  const matchingSkills = job.requiredSkills.filter((skill) => owned.has(skill.skillId));
  const missingSkills = job.requiredSkills.filter((skill) => !owned.has(skill.skillId));

  const skillRatio =
    job.requiredSkills.length === 0 ? 1 : matchingSkills.length / job.requiredSkills.length;

  const reasons: MatchReason[] = [];

  reasons.push({
    kind: 'skills',
    impact: skillRatio >= 0.6 ? 'positive' : skillRatio >= 0.35 ? 'neutral' : 'negative',
    text: `${String(matchingSkills.length)} of ${String(job.requiredSkills.length)} required skills matched`,
  });

  let seniorityScore = 0.6;
  let locationScore = 0.6;
  let salaryScore = 0.6;
  let roleScore = 0.5;

  if (preferences !== null) {
    const distance = seniorityDistance(preferences.seniority, job.seniority);
    seniorityScore = distance === 0 ? 1 : distance === 1 ? 0.7 : 0.25;
    reasons.push({
      kind: 'seniority',
      impact: distance === 0 ? 'positive' : distance === 1 ? 'neutral' : 'negative',
      text:
        distance === 0
          ? 'Seniority matches your target level'
          : `Role is ${String(distance)} level${distance === 1 ? '' : 's'} from your target`,
    });

    const remoteOk = preferences.remoteMode === 'any' || preferences.remoteMode === job.remoteMode;
    const locationOk =
      job.remoteMode === 'remote' ||
      preferences.locations.some((location) => job.location.includes(location));
    locationScore = locationOk && remoteOk ? 1 : locationOk || remoteOk ? 0.6 : 0.2;
    reasons.push({
      kind: 'location',
      impact: locationScore >= 0.9 ? 'positive' : locationScore >= 0.5 ? 'neutral' : 'negative',
      text: locationOk ? `${job.location} is within your preferred areas` : `${job.location} is outside your preferred areas`,
    });

    if (job.salary !== null) {
      const overlaps =
        job.salary.max >= preferences.salary.min && job.salary.min <= preferences.salary.max;
      const exceeds = job.salary.min >= preferences.salary.min;
      salaryScore = exceeds ? 1 : overlaps ? 0.7 : 0.2;
      reasons.push({
        kind: 'salary',
        impact: salaryScore >= 0.9 ? 'positive' : salaryScore >= 0.5 ? 'neutral' : 'negative',
        text: overlaps ? 'Salary range overlaps your expectations' : 'Salary is below your expectations',
      });
    }

    roleScore = preferences.desiredRoles.includes(job.roleKey) ? 1 : 0.3;
    reasons.push({
      kind: 'role',
      impact: roleScore === 1 ? 'positive' : 'negative',
      text: roleScore === 1 ? 'Matches a role you are targeting' : 'Outside the roles you selected',
    });
  }

  const weighted =
    skillRatio * WEIGHTS.skills +
    seniorityScore * WEIGHTS.seniority +
    locationScore * WEIGHTS.location +
    salaryScore * WEIGHTS.salary +
    roleScore * WEIGHTS.role;

  // A small deterministic jitter keeps scores from clustering on identical values
  // without making them unpredictable between runs.
  const jitter = (hashString(job.id) % 700) / 100 - 3.5;

  return {
    jobId: job.id,
    score: clampScore(weighted * 100 + jitter),
    matchingSkills,
    missingSkills,
    reasons,
    computedAt: nowIso(),
  };
};
