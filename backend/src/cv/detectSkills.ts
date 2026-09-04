export interface SkillEntry {
  readonly id: string;
  readonly name: string;
  readonly aliases: readonly string[];
}

export interface DetectedSkill {
  readonly skillId: string;
  readonly name: string;
  readonly level: 'basic' | 'proficient' | 'expert';
  /** Mentions found, used to rank and to infer level. */
  readonly mentions: number;
}

/**
 * Characters that can legitimately sit inside a skill name — `Node.js`, `C#`,
 * `CI/CD`, `C++`. A match is accepted only when the characters either side of
 * it fall outside this set, so `Go` does not match `Django` or `going`, and
 * `SQL` does not match `NoSQL`.
 */
const TOKEN_CHAR = /[a-z0-9+#./]/;

const normalise = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ');

const occurrences = (haystack: string, needle: string): number => {
  if (needle === '') return 0;

  let count = 0;
  let index = haystack.indexOf(needle);

  while (index !== -1) {
    const before = index === 0 ? '' : (haystack[index - 1] ?? '');
    const afterIndex = index + needle.length;
    const after = afterIndex >= haystack.length ? '' : (haystack[afterIndex] ?? '');

    if (!TOKEN_CHAR.test(before) && !TOKEN_CHAR.test(after)) count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }

  return count;
};

/**
 * How confident the CV is about a skill, inferred from how often it comes up.
 *
 * Crude on purpose: repetition is a weak signal, and calling it anything more
 * precise would overstate what counting words can tell you. A real
 * implementation reads the surrounding sentence — "mentored a junior in React"
 * and "five years building React design systems" are not the same claim.
 */
const levelFor = (count: number): DetectedSkill['level'] => {
  if (count >= 4) return 'expert';
  if (count >= 2) return 'proficient';
  return 'basic';
};

/**
 * Finds catalogue skills mentioned in a CV.
 *
 * The catalogue is passed in rather than imported, because on the server it
 * comes from the skills table — the same rows the job listings reference. That
 * is what makes "this CV has Kubernetes" and "this job needs Kubernetes" the
 * same fact rather than two lists that can drift.
 *
 * The limitation is unchanged from the mock: it finds only skills already in
 * the catalogue, and cannot tell a skill someone has from one they merely
 * mentioned — "looking to learn Kubernetes" counts. Both need context to fix,
 * and neither is worth faking.
 */
export const detectSkills = (
  text: string,
  catalogue: readonly SkillEntry[],
): DetectedSkill[] => {
  const haystack = normalise(text);
  if (haystack.trim() === '') return [];

  const found: DetectedSkill[] = [];

  for (const skill of catalogue) {
    const terms = [skill.name, ...skill.aliases].map(normalise);
    const mentions = terms.reduce((total, term) => total + occurrences(haystack, term), 0);
    if (mentions === 0) continue;

    found.push({
      skillId: skill.id,
      name: skill.name,
      level: levelFor(mentions),
      mentions,
    });
  }

  // Most-mentioned first, so the strongest signals lead.
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
