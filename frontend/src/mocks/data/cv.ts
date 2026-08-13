import { daysAgo } from '@/lib/dates';
import { asCvId, asUserId } from '@/types';
import type { CV, CVAnalysis } from '@/types';

import { skillRef } from './skills';

export const DEMO_CV: CV = {
  id: asCvId('cv-demo'),
  userId: asUserId('user-demo'),
  fileName: 'alex-ronen-cv.pdf',
  fileSizeBytes: 284_512,
  mimeType: 'application/pdf',
  source: 'upload',
  uploadedAt: daysAgo(30),
  status: 'ready',
};

/**
 * The skills this CV is deemed to contain. The mock matching engine scores every
 * job against exactly this list, which is why frontend roles land high and
 * infrastructure roles land low — the spread is intentional, not random.
 */
export const DEMO_CV_ANALYSIS: CVAnalysis = {
  id: 'analysis-demo',
  cvId: asCvId('cv-demo'),
  score: 74,
  breakdown: [
    {
      key: 'structure',
      score: 86,
      weight: 0.15,
      summary: 'Clear sections and consistent formatting throughout.',
      tips: ['Move the education block below experience', 'Keep the CV to two pages'],
    },
    {
      key: 'skills',
      score: 71,
      weight: 0.3,
      summary: 'Strong frontend coverage, thin on infrastructure.',
      tips: [
        'Add container and orchestration experience if you have any',
        'Group skills by category rather than one long list',
      ],
    },
    {
      key: 'experience',
      score: 78,
      weight: 0.25,
      summary: 'Four years of relevant work, well described.',
      tips: ['Lead each bullet with the outcome, not the task'],
    },
    {
      key: 'keywords',
      score: 62,
      weight: 0.15,
      summary: 'Missing several terms that appear in most matching listings.',
      tips: ['Mention TypeScript explicitly in the summary', 'Add "design system" if applicable'],
    },
    {
      key: 'education',
      score: 80,
      weight: 0.05,
      summary: 'Relevant degree, clearly presented.',
      tips: [],
    },
    {
      key: 'impact',
      score: 64,
      weight: 0.1,
      summary: 'Few quantified results.',
      tips: [
        'Add measurable outcomes: load time, conversion, team size',
        'Replace "responsible for" with what actually changed',
      ],
    },
  ],
  detectedSkills: [
    skillRef('sk-react', 'expert'),
    skillRef('sk-ts', 'proficient'),
    skillRef('sk-js', 'expert'),
    skillRef('sk-redux', 'proficient'),
    skillRef('sk-node', 'proficient'),
    skillRef('sk-sql', 'basic'),
    skillRef('sk-docker', 'basic'),
    skillRef('sk-git', 'expert'),
    skillRef('sk-agile', 'proficient'),
    skillRef('sk-a11y', 'basic'),
    skillRef('sk-communication', 'proficient'),
  ],
  missingSkills: [
    {
      skillId: skillRef('sk-k8s').skillId,
      name: 'Kubernetes',
      demandPercent: 68,
      appearsInJobs: 3,
      priority: 'medium',
      learnEstimateWeeks: 8,
    },
    {
      skillId: skillRef('sk-graphql').skillId,
      name: 'GraphQL',
      demandPercent: 41,
      appearsInJobs: 2,
      priority: 'high',
      learnEstimateWeeks: 3,
    },
    {
      skillId: skillRef('sk-nextjs').skillId,
      name: 'Next.js',
      demandPercent: 52,
      appearsInJobs: 2,
      priority: 'high',
      learnEstimateWeeks: 2,
    },
    {
      skillId: skillRef('sk-terraform').skillId,
      name: 'Terraform',
      demandPercent: 57,
      appearsInJobs: 2,
      priority: 'low',
      learnEstimateWeeks: 6,
    },
  ],
  experienceYears: 4,
  seniorityEstimate: 'mid',
  keywords: {
    found: ['React', 'JavaScript', 'REST', 'Agile', 'Code review'],
    missing: ['TypeScript', 'Design system', 'Performance budget', 'WCAG'],
  },
  recommendations: [
    {
      id: 'rec-1',
      severity: 'critical',
      title: 'Quantify your impact',
      body: 'Six of your bullets describe responsibilities without an outcome. Recruiters scan for numbers first — add measurable results wherever you have them.',
      actionLabel: 'View CV analysis',
      actionRoute: '/cv',
    },
    {
      id: 'rec-2',
      severity: 'important',
      title: 'Name TypeScript explicitly',
      body: 'Your experience implies TypeScript but never states it. Most matching listings filter on the exact term.',
    },
    {
      id: 'rec-3',
      severity: 'important',
      title: 'Add Next.js to close a common gap',
      body: 'Next.js appears in roughly half the senior frontend listings you match. It is the cheapest gap on your list to close.',
      actionLabel: 'See market demand',
      actionRoute: '/market',
    },
    {
      id: 'rec-4',
      severity: 'nice',
      title: 'Group your skills by category',
      body: 'A single flat list buries your strongest areas. Grouping by language, framework and tooling reads faster.',
    },
  ],
  matchedJobsCount: 5,
  analyzedAt: daysAgo(30),
};
