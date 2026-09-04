import { FinishReason } from '@google/genai';
import { describe, expect, it } from 'vitest';

import { GeminiCvError } from './cvAnalysisContract.js';
import type { CvAnalysis, SkillExperience } from './cvAnalysisContract.js';
import { extractCvAnalysis } from './extractCvAnalysis.js';
import type { GenerateJson, ModelRequest } from './extractCvAnalysis.js';

/**
 * Regression cover for the extraction pipeline.
 *
 * The model is replaced by a stub throughout. That is deliberate: a live call
 * would make the suite slow, billable and non-deterministic, and it would test
 * Gemini rather than our handling of what Gemini returns.
 *
 * What is still tested about the prompt is everything our code decides — that
 * the whole CV is sent, and that the contract and the reading guidance both
 * reach the model. What no unit test can settle is whether the model then
 * obeys; the synthetic fixtures below exist so that question can be re-run by
 * hand against the real API with `npm run gemini:cv`.
 *
 * Fixtures are invented people. No real CV belongs in this repository.
 */

// --------------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------------

/**
 * AWS runs through the summary, two roles and the skills list; Vault appears in
 * the skills list only; the competencies block holds non-technical skills with
 * no usage detail. One CV covering full-context reading, list-only restraint
 * and section coverage at once.
 */
const layeredCv = `
Rin Kobayashi
Cloud Platform Engineer
rin.kobayashi@example.net

PROFESSIONAL SUMMARY
Cloud platform engineer with 7+ years of experience running AWS infrastructure
for high-traffic services, with a focus on automation and reliability.

PROFESSIONAL EXPERIENCE

Senior Platform Engineer, Brightwell Analytics
2019 - Present
- Designed and maintained the AWS landing zone used by every product team.
- Automated environment provisioning end to end, removing manual setup.

Platform Engineer, Cobalt Interactive
2017 - 2019
- Supported the AWS estate and handled on-call escalations.

TECHNICAL SKILLS
AWS, Terraform, Kubernetes, Vault

CORE COMPETENCIES
Infrastructure Automation    Stakeholder Communication    Release Management
`.trim();

/**
 * A two-column skills block flattened by OCR, with a character error in the
 * heading. Ansible belongs to the left column and ArgoCD to the right, but the
 * flattening leaves them side by side at the end of one line.
 */
const ocrCv = `
7:52 ,14.8.2026 Platform Engineer CV

Noa Ferreira
DEVOPS ENGINEER

TECHNICAL SKILLS
1aC: Terraform, Pulumi, CloudFormation, CI/CD: Jenkins, GitLab CI, Ansible ArgoCD

PROFESSIONAL EXPERIENCE
Platform Engineer, Halden Systems
2020 - 2023
« Built delivery pipelines and automated provisioning for 20+ services.

https://example.invalid/artifact/0000-1111 1/1
`.trim();

// --------------------------------------------------------------------------
// Building canned model replies
// --------------------------------------------------------------------------

type SkillSeed = Partial<SkillExperience> & Pick<SkillExperience, 'skill' | 'evidence'>;

const skill = (over: SkillSeed): SkillExperience => ({
  period: { startDate: null, endDate: null, isCurrent: null },
  experienceDuration: { unit: 'years', value: null },
  usageDepth: { level: 'mentioned_only', activities: [] },
  ...over,
});

const document = (over: Partial<CvAnalysis> = {}): CvAnalysis => ({
  personalInformation: {},
  technicalExperience: [],
  nonTechnicalExperience: [],
  achievements: [],
  other: {},
  ...over,
});

/** A stub model that returns `reply` and records what it was asked. */
const stub = (
  reply: string | undefined,
  finishReason?: FinishReason,
): { generate: GenerateJson; requests: ModelRequest[] } => {
  const requests: ModelRequest[] = [];

  const generate: GenerateJson = (request) => {
    requests.push(request);
    return Promise.resolve({ text: reply, finishReason });
  };

  return { generate, requests };
};

const returning = (analysis: CvAnalysis): GenerateJson => stub(JSON.stringify(analysis)).generate;

const codeOf = async (run: () => Promise<unknown>): Promise<string> => {
  try {
    await run();
  } catch (error) {
    if (error instanceof GeminiCvError) return error.code;
    throw error;
  }

  throw new Error('Expected the extraction to fail, but it succeeded.');
};

// --------------------------------------------------------------------------
// A semantic audit, for the rules Ajv cannot express
// --------------------------------------------------------------------------

const normalise = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const words = (value: string): string[] =>
  normalise(value)
    .split(' ')
    .filter((word) => word.length > 3);

/**
 * Reports claims a document makes that its source CV does not support.
 *
 * The schema cannot catch any of this: an invented employer, a fabricated
 * excerpt and a zero standing in for an unknown duration are all structurally
 * valid. This is the check that separates "schema-correct" from "true".
 */
const unsupportedClaims = (analysis: CvAnalysis, source: string): string[] => {
  const haystack = normalise(source);
  const found: string[] = [];

  for (const entry of [...analysis.technicalExperience, ...analysis.nonTechnicalExperience]) {
    if (entry.experienceDuration.value === 0) {
      found.push(`${entry.skill}: duration 0 used as a placeholder for unknown`);
    }

    for (const date of [entry.period.startDate, entry.period.endDate]) {
      const year = date === null ? undefined : date.slice(0, 4);

      if (year !== undefined && !source.includes(year)) {
        found.push(`${entry.skill}: date ${date ?? ''} cites a year absent from the CV`);
      }
    }

    for (const item of entry.evidence) {
      const attributions = [
        ['employer', item.employer],
        ['role', item.role],
      ] as const;

      for (const [label, value] of attributions) {
        if (value !== null && !haystack.includes(normalise(value))) {
          found.push(`${entry.skill}: ${label} "${value}" does not appear in the CV`);
        }
      }

      // A faithful excerpt may be paraphrased, so grounding is measured by how
      // much of its substance is traceable rather than by exact quotation.
      const tokens = words(item.sourceExcerpt);
      const grounded = tokens.filter((token) => haystack.includes(token)).length;

      if (tokens.length > 0 && grounded / tokens.length < 0.7) {
        found.push(`${entry.skill}: excerpt is not grounded in the CV`);
      }
    }
  }

  for (const achievement of analysis.achievements) {
    if (!haystack.includes(normalise(achievement.content))) {
      found.push(`achievement "${achievement.content}" does not appear in the CV`);
    }
  }

  return found;
};

// --------------------------------------------------------------------------
// What our code sends
// --------------------------------------------------------------------------

describe('the prompt the model receives', () => {
  it('sends the entire CV, not only the section that looks like a skills list', async () => {
    const { generate, requests } = stub(JSON.stringify(document()));
    await extractCvAnalysis(layeredCv, generate);

    const prompt = requests[0]!.prompt;

    // Scenario 1: the summary and the role bullets are the evidence that turns
    // a listed skill into a demonstrated one. If a future change trims the CV
    // down to its skills block, every one of these disappears.
    expect(prompt).toContain('7+ years of experience running AWS infrastructure');
    expect(prompt).toContain('Designed and maintained the AWS landing zone');
    expect(prompt).toContain('Supported the AWS estate');
    expect(prompt).toContain('AWS, Terraform, Kubernetes, Vault');
    expect(prompt).toContain('Infrastructure Automation');

    // Whole and unedited.
    expect(prompt).toContain(layeredCv);
  });

  it('sends the schema and the worked example', async () => {
    const { generate, requests } = stub(JSON.stringify(document()));
    await extractCvAnalysis(layeredCv, generate);

    expect(requests[0]!.prompt).toContain('Skills-First CV Analysis');
    expect(requests[0]!.prompt).toContain('sourceExcerpt');
  });

  it('sends the contract rules and the reading guidance together', async () => {
    const { generate, requests } = stub(JSON.stringify(document()));
    await extractCvAnalysis(layeredCv, generate);

    const instruction = requests[0]!.systemInstruction;

    // The contract's own wording, and the pipeline's additions. Both have to
    // survive; dropping either changed the output materially in manual runs.
    expect(instruction).toContain('Treat the CV as the only source of truth');
    expect(instruction).toContain('Reading the extracted text');
    expect(instruction).toContain('Using the whole CV for every skill');
    expect(instruction).toContain('Covering every section');
    expect(instruction).toContain('sourceExcerpt must quote the extracted text as it actually reads');
    expect(instruction).toContain('Never write 0 to stand in for');
    expect(instruction).toContain('it is not itself a skill');
  });

  it('asks for no field the contract does not define', async () => {
    const { generate, requests } = stub(JSON.stringify(document()));
    await extractCvAnalysis(layeredCv, generate);

    const asked = `${requests[0]!.prompt}\n${requests[0]!.systemInstruction}`;

    // Scoring, matching and recommendations are a later task and a different
    // service. None of that vocabulary belongs in this prompt.
    for (const forbidden of ['matchScore', 'candidateScore', 'recommendations', 'potentialScore']) {
      expect(asked).not.toContain(forbidden);
    }
  });
});

// --------------------------------------------------------------------------
// The seven scenarios
// --------------------------------------------------------------------------

describe('scenario 1: a skill supported across summary, experience and skills list', () => {
  it('accepts a record that cites evidence from more than one section', async () => {
    const analysis = document({
      technicalExperience: [
        skill({
          skill: 'AWS',
          period: { startDate: '2017', endDate: null, isCurrent: true },
          experienceDuration: { unit: 'years', value: null },
          usageDepth: { level: 'deep', activities: ['design', 'maintain'] },
          evidence: [
            {
              sourceExcerpt: 'Designed and maintained the AWS landing zone used by every product team.',
              employer: 'Brightwell Analytics',
              role: 'Senior Platform Engineer',
            },
            {
              sourceExcerpt: 'Supported the AWS estate and handled on-call escalations.',
              employer: 'Cobalt Interactive',
              role: 'Platform Engineer',
            },
          ],
        }),
      ],
    });

    const result = await extractCvAnalysis(layeredCv, returning(analysis));
    const aws = result.analysis.technicalExperience[0]!;

    expect(aws.evidence).toHaveLength(2);
    expect(aws.usageDepth.level).toBe('deep');
    expect(unsupportedClaims(result.analysis, layeredCv)).toEqual([]);
  });
});

describe('scenario 2: a non-technical skill that appears only in a competencies block', () => {
  it('keeps it, rather than dropping it for having no usage detail', async () => {
    const competencies = ['Infrastructure Automation', 'Stakeholder Communication', 'Release Management'];

    const analysis = document({
      nonTechnicalExperience: competencies.map((name) =>
        skill({
          skill: name,
          evidence: [{ sourceExcerpt: `CORE COMPETENCIES: ${name}`, employer: null, role: null }],
        }),
      ),
    });

    const result = await extractCvAnalysis(layeredCv, returning(analysis));
    const names = result.analysis.nonTechnicalExperience.map((entry) => entry.skill);

    // The real-CV run dropped exactly one competency of this kind. The guard is
    // that every entry in the block survives, not that one named string does.
    for (const name of competencies) expect(names).toContain(name);

    expect(unsupportedClaims(result.analysis, layeredCv)).toEqual([]);
  });
});

describe('scenario 3: a two-column skills block flattened by OCR', () => {
  it('accepts items regrouped under the heading they belong to', async () => {
    const analysis = document({
      technicalExperience: [
        // Ansible sits at the end of the flattened line, next to ArgoCD, but
        // belongs to the left-hand IaC column.
        skill({
          skill: 'Ansible',
          evidence: [
            { sourceExcerpt: '1aC: Terraform, Pulumi, CloudFormation, Ansible', employer: null, role: null },
          ],
        }),
        skill({
          skill: 'ArgoCD',
          evidence: [{ sourceExcerpt: 'CI/CD: Jenkins, GitLab CI, ArgoCD', employer: null, role: null }],
        }),
      ],
    });

    const result = await extractCvAnalysis(ocrCv, returning(analysis));
    const ansible = result.analysis.technicalExperience[0]!;

    // The excerpt still carries the source's own OCR error. Correcting it to
    // "IaC" would be a claim the source does not support.
    expect(ansible.evidence[0]!.sourceExcerpt).toContain('1aC');
    expect(unsupportedClaims(result.analysis, ocrCv)).toEqual([]);
  });

  it('flags an excerpt that silently rewrites the source', async () => {
    const analysis = document({
      technicalExperience: [
        skill({
          skill: 'Ansible',
          evidence: [
            {
              sourceExcerpt: 'Infrastructure as Code toolchain standardised across every environment',
              employer: null,
              role: null,
            },
          ],
        }),
      ],
    });

    const result = await extractCvAnalysis(ocrCv, returning(analysis));

    expect(unsupportedClaims(result.analysis, ocrCv).join(' ')).toContain('not grounded');
  });
});

describe('scenario 4: a CV with no achievements section', () => {
  it('accepts an empty achievements array', async () => {
    const result = await extractCvAnalysis(layeredCv, returning(document()));

    expect(result.analysis.achievements).toEqual([]);
    expect(unsupportedClaims(result.analysis, layeredCv)).toEqual([]);
  });

  it('flags an invented degree', async () => {
    const analysis = document({
      achievements: [
        {
          type: 'education',
          content: 'B.Sc. Computer Science',
          institution: 'Imaginary Institute of Technology',
          startDate: '2010',
          endDate: '2014',
        },
      ],
    });

    const result = await extractCvAnalysis(layeredCv, returning(analysis));

    expect(unsupportedClaims(result.analysis, layeredCv).join(' ')).toContain('does not appear in the CV');
  });
});

describe('scenario 5: dates are populated only where the CV supports them', () => {
  it('accepts explicit dates and a null end date for current work', async () => {
    const analysis = document({
      technicalExperience: [
        skill({
          skill: 'AWS',
          period: { startDate: '2017', endDate: null, isCurrent: true },
          experienceDuration: { unit: 'years', value: null },
          usageDepth: { level: 'deep', activities: ['design'] },
          evidence: [
            {
              sourceExcerpt: 'Designed and maintained the AWS landing zone used by every product team.',
              employer: 'Brightwell Analytics',
              role: 'Senior Platform Engineer',
            },
          ],
        }),
      ],
    });

    const result = await extractCvAnalysis(layeredCv, returning(analysis));
    const aws = result.analysis.technicalExperience[0]!;

    // Current work has no end date, and a duration that cannot be computed
    // from explicit dates stays null rather than becoming a guess.
    expect(aws.period.endDate).toBeNull();
    expect(aws.period.isCurrent).toBe(true);
    expect(aws.experienceDuration.value).toBeNull();
    expect(unsupportedClaims(result.analysis, layeredCv)).toEqual([]);
  });

  it('flags a year the CV never mentions', async () => {
    const analysis = document({
      technicalExperience: [
        skill({
          skill: 'Terraform',
          period: { startDate: '2012', endDate: null, isCurrent: true },
          evidence: [{ sourceExcerpt: 'AWS, Terraform, Kubernetes, Vault', employer: null, role: null }],
        }),
      ],
    });

    const result = await extractCvAnalysis(layeredCv, returning(analysis));

    expect(unsupportedClaims(result.analysis, layeredCv).join(' ')).toContain('2012');
  });

  it('flags a zero standing in for an unknown duration', async () => {
    const analysis = document({
      technicalExperience: [
        skill({
          skill: 'Vault',
          experienceDuration: { unit: 'years', value: 0 },
          evidence: [{ sourceExcerpt: 'AWS, Terraform, Kubernetes, Vault', employer: null, role: null }],
        }),
      ],
    });

    const result = await extractCvAnalysis(layeredCv, returning(analysis));

    expect(unsupportedClaims(result.analysis, layeredCv).join(' ')).toContain('placeholder');
  });
});

describe('scenario 6: evidence does not invent employer or role', () => {
  it('accepts null where the CV makes no explicit connection', async () => {
    const analysis = document({
      technicalExperience: [
        skill({
          skill: 'Vault',
          evidence: [{ sourceExcerpt: 'AWS, Terraform, Kubernetes, Vault', employer: null, role: null }],
        }),
      ],
    });

    const result = await extractCvAnalysis(layeredCv, returning(analysis));

    expect(result.analysis.technicalExperience[0]!.evidence[0]!.employer).toBeNull();
    expect(unsupportedClaims(result.analysis, layeredCv)).toEqual([]);
  });

  it('flags an employer and role that appear nowhere in the CV', async () => {
    const analysis = document({
      technicalExperience: [
        skill({
          skill: 'Kubernetes',
          evidence: [
            {
              sourceExcerpt: 'AWS, Terraform, Kubernetes, Vault',
              employer: 'Globex Corporation',
              role: 'Principal Engineer',
            },
          ],
        }),
      ],
    });

    const result = await extractCvAnalysis(layeredCv, returning(analysis));
    const claims = unsupportedClaims(result.analysis, layeredCv).join(' ');

    expect(claims).toContain('Globex Corporation');
    expect(claims).toContain('Principal Engineer');
  });
});

describe('scenario 7: a skill that appears only in a list stays conservative', () => {
  it('accepts mentioned_only with no dates and no duration', async () => {
    const analysis = document({
      technicalExperience: [
        skill({
          skill: 'Vault',
          evidence: [{ sourceExcerpt: 'AWS, Terraform, Kubernetes, Vault', employer: null, role: null }],
        }),
      ],
    });

    const result = await extractCvAnalysis(layeredCv, returning(analysis));
    const vault = result.analysis.technicalExperience[0]!;

    expect(vault.usageDepth.level).toBe('mentioned_only');
    expect(vault.usageDepth.activities).toEqual([]);
    expect(vault.period.startDate).toBeNull();
    expect(vault.experienceDuration.value).toBeNull();
    expect(unsupportedClaims(result.analysis, layeredCv)).toEqual([]);
  });
});

// --------------------------------------------------------------------------
// Failure handling
// --------------------------------------------------------------------------

describe('failures carry a code a caller can branch on', () => {
  it('refuses empty CV text before calling the model', async () => {
    let called = false;

    const generate: GenerateJson = () => {
      called = true;
      return Promise.resolve({ text: '{}', finishReason: undefined });
    };

    expect(await codeOf(() => extractCvAnalysis('   \n\t  ', generate))).toBe('CV_TEXT_EMPTY');
    expect(called).toBe(false);
  });

  it('separates a truncated answer from an empty one', async () => {
    expect(
      await codeOf(() => extractCvAnalysis(layeredCv, stub('', FinishReason.MAX_TOKENS).generate)),
    ).toBe('GEMINI_RESPONSE_TRUNCATED');

    expect(await codeOf(() => extractCvAnalysis(layeredCv, stub(undefined).generate))).toBe(
      'GEMINI_EMPTY_RESPONSE',
    );

    expect(await codeOf(() => extractCvAnalysis(layeredCv, stub('', FinishReason.SAFETY).generate))).toBe(
      'GEMINI_EMPTY_RESPONSE',
    );
  });

  it('reports malformed JSON without echoing the reply', async () => {
    const secret = 'candidate.private@example.net';
    const truncated = `{"personalInformation": {"email": "${secret}"`;

    try {
      await extractCvAnalysis(layeredCv, stub(truncated).generate);
      throw new Error('Expected the extraction to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(GeminiCvError);
      const failure = error as GeminiCvError;

      expect(failure.code).toBe('GEMINI_INVALID_JSON');
      // The reply may carry the candidate's own details; only its length and
      // the parser's complaint are reportable.
      expect(failure.message).not.toContain(secret);
    }
  });

  it('rejects a document that parses but does not match the contract', async () => {
    expect(
      await codeOf(() => extractCvAnalysis(layeredCv, stub('{"personalInformation":{}}').generate)),
    ).toBe('GEMINI_SCHEMA_VIOLATION');
  });

  it('reports the model and the input size on success', async () => {
    const result = await extractCvAnalysis(layeredCv, returning(document()));

    expect(result.model).toBe('gemini-3.6-flash');
    expect(result.inputCharacters).toBe(layeredCv.length);
  });
});
