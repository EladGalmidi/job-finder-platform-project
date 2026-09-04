import type { Skill, SkillLevel, SkillRef } from '@/types';

import { SKILLS } from '../data/skills';

/**
 * Characters that can legitimately sit inside a skill name — `Node.js`, `C#`,
 * `CI/CD`, `C++`. A match is only accepted when the characters either side of it
 * are outside this set, so `Go` does not match `Django` or `going`, and `SQL`
 * does not match `NoSQL`.
 */
const TOKEN_CHAR = /[a-z0-9+#./]/;

const normalise = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ');

const occurrences = (haystack: string, needle: string): number => {
  if (needle === '') return 0;

  let count = 0;
  let index = haystack.indexOf(needle);

  while (index !== -1) {
    const before = index === 0 ? '' : haystack[index - 1] ?? '';
    const afterIndex = index + needle.length;
    const after = afterIndex >= haystack.length ? '' : haystack[afterIndex] ?? '';

    if (!TOKEN_CHAR.test(before) && !TOKEN_CHAR.test(after)) count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }

  return count;
};

/**
 * How confident the CV is about a skill, inferred from how often it comes up.
 *
 * Crude on purpose: repetition is a weak signal, and calling it anything more
 * precise than this would overstate what counting words can tell you. A real
 * implementation reads the surrounding sentence — "mentored a junior in React"
 * and "five years building React design systems" are not the same claim.
 */
const levelFor = (count: number): SkillLevel => {
  if (count >= 4) return 'expert';
  if (count >= 2) return 'proficient';
  return 'basic';
};

const termsFor = (skill: Skill): string[] => [skill.name, ...skill.aliases].map(normalise);

export interface DetectedSkill extends SkillRef {
  /** Number of mentions found, used to rank and to infer level. */
  readonly mentions: number;
}

/**
 * Finds taxonomy skills mentioned in a CV.
 *
 * Dictionary matching over names and aliases — the `aliases` field existed in
 * the model from the start and was never read until now, which is why `k8s` and
 * `reactjs` used to go unrecognised.
 *
 * The obvious limitation: it only finds skills already in the taxonomy, and it
 * cannot tell a skill someone has from one they merely mentioned ("looking to
 * learn Kubernetes" counts as Kubernetes). Both are the kind of thing a real
 * extraction service handles with context, and neither is worth faking here.
 */
export const detectSkills = (text: string): DetectedSkill[] => {
  const haystack = normalise(text);
  if (haystack.trim() === '') return [];

  const found: DetectedSkill[] = [];

  for (const skill of SKILLS) {
    const mentions = termsFor(skill).reduce(
      (total, term) => total + occurrences(haystack, term),
      0,
    );
    if (mentions === 0) continue;

    found.push({
      skillId: skill.id,
      name: skill.name,
      level: levelFor(mentions),
      mentions,
    });
  }

  // Most-mentioned first, so the strongest signals lead the list.
  return found.sort((left, right) => right.mentions - left.mentions);
};

/** Years of experience, read from phrases like "6+ years" or "5 years of". */
export const detectExperienceYears = (text: string): number | null => {
  const matches = [...normalise(text).matchAll(/(\d{1,2})\s*\+?\s*years?/g)];
  if (matches.length === 0) return null;

  const years = matches
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 50);

  // The largest claim is the one a reader takes as the headline.
  return years.length === 0 ? null : Math.max(...years);
};
