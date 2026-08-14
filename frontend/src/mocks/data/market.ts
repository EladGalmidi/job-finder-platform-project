import { daysAgo } from '@/lib/dates';
import type { MarketRoleSnapshot, MarketSalaryBand, MarketSkill, RoleKey, Seniority } from '@/types';

import { findSkill } from './skills';

const band = (min: number, median: number, max: number): MarketSalaryBand => ({
  min,
  median,
  max,
  currency: 'ILS',
  period: 'month',
});

const salaries = (
  entries: Readonly<Record<Seniority, readonly [number, number, number]>>,
): Readonly<Record<Seniority, MarketSalaryBand>> => ({
  junior: band(...entries.junior),
  mid: band(...entries.mid),
  senior: band(...entries.senior),
  lead: band(...entries.lead),
  principal: band(...entries.principal),
});

const marketSkill = (
  id: string,
  roleKey: RoleKey,
  demandPercent: number,
  trend: MarketSkill['trend'],
  trendDelta: number,
  avgSalaryImpactPercent: number,
  openPositions: number,
): MarketSkill => {
  const skill = findSkill(id);
  return {
    skillId: skill.id,
    name: skill.name,
    roleKey,
    demandPercent,
    trend,
    trendDelta,
    avgSalaryImpactPercent,
    openPositions,
  };
};

const sources = (sampleSize: number) => [
  {
    name: 'Aggregated job boards',
    url: 'https://example.com/sources/boards',
    sampleSize,
    collectedAt: daysAgo(3),
  },
  {
    name: 'Salary survey panel',
    url: 'https://example.com/sources/survey',
    sampleSize: Math.round(sampleSize * 0.22),
    collectedAt: daysAgo(11),
  },
];

export const MARKET_SNAPSHOTS: Readonly<Partial<Record<RoleKey, MarketRoleSnapshot>>> = {
  devops: {
    roleKey: 'devops',
    updatedAt: daysAgo(3),
    sources: sources(1840),
    topSkills: [
      marketSkill('sk-k8s', 'devops', 82, 'up', 6, 14, 412),
      marketSkill('sk-terraform', 'devops', 71, 'up', 9, 11, 358),
      marketSkill('sk-aws', 'devops', 68, 'stable', 1, 9, 341),
      marketSkill('sk-docker', 'devops', 64, 'stable', 0, 5, 320),
      marketSkill('sk-cicd', 'devops', 61, 'up', 4, 7, 305),
      marketSkill('sk-prometheus', 'devops', 44, 'up', 5, 6, 221),
      marketSkill('sk-jenkins', 'devops', 38, 'down', -9, 2, 190),
      marketSkill('sk-grafana', 'devops', 35, 'up', 3, 4, 176),
      marketSkill('sk-argocd', 'devops', 29, 'up', 12, 8, 145),
      marketSkill('sk-helm', 'devops', 26, 'stable', 1, 5, 131),
    ],
    salaryBySeniority: salaries({
      junior: [16000, 19500, 23000],
      mid: [23000, 28000, 33000],
      senior: [31000, 37000, 44000],
      lead: [40000, 46000, 54000],
      principal: [48000, 56000, 68000],
    }),
    openPositions: 502,
    competitionIndex: 12.4,
  },
  backend: {
    roleKey: 'backend',
    updatedAt: daysAgo(3),
    sources: sources(3120),
    topSkills: [
      marketSkill('sk-python', 'backend', 66, 'up', 3, 8, 690),
      marketSkill('sk-postgres', 'backend', 63, 'stable', 1, 6, 655),
      marketSkill('sk-microservices', 'backend', 58, 'stable', -1, 7, 604),
      marketSkill('sk-go', 'backend', 47, 'up', 11, 15, 489),
      marketSkill('sk-kafka', 'backend', 38, 'up', 5, 10, 396),
      marketSkill('sk-java', 'backend', 36, 'down', -6, 4, 374),
      marketSkill('sk-redis', 'backend', 33, 'stable', 2, 5, 344),
      marketSkill('sk-node', 'backend', 31, 'up', 4, 5, 322),
      marketSkill('sk-graphql', 'backend', 27, 'stable', 0, 6, 281),
      marketSkill('sk-k8s', 'backend', 24, 'up', 7, 9, 250),
    ],
    salaryBySeniority: salaries({
      junior: [15000, 18500, 22000],
      mid: [22000, 27000, 32000],
      senior: [30000, 35500, 42000],
      lead: [38000, 44000, 52000],
      principal: [46000, 54000, 64000],
    }),
    openPositions: 1041,
    competitionIndex: 18.9,
  },
  frontend: {
    roleKey: 'frontend',
    updatedAt: daysAgo(3),
    sources: sources(2470),
    topSkills: [
      marketSkill('sk-react', 'frontend', 88, 'stable', 1, 9, 742),
      marketSkill('sk-ts', 'frontend', 79, 'up', 8, 12, 668),
      marketSkill('sk-nextjs', 'frontend', 52, 'up', 14, 10, 438),
      marketSkill('sk-a11y', 'frontend', 34, 'up', 7, 5, 287),
      marketSkill('sk-graphql', 'frontend', 31, 'stable', -1, 6, 262),
      marketSkill('sk-redux', 'frontend', 29, 'down', -8, 2, 245),
      marketSkill('sk-figma', 'frontend', 26, 'stable', 2, 3, 219),
      marketSkill('sk-tdd', 'frontend', 23, 'up', 5, 4, 194),
      marketSkill('sk-node', 'frontend', 21, 'stable', 0, 3, 177),
      marketSkill('sk-js', 'frontend', 19, 'down', -12, 0, 160),
    ],
    salaryBySeniority: salaries({
      junior: [14500, 17500, 21000],
      mid: [21000, 26000, 31000],
      senior: [29000, 34500, 41000],
      lead: [37000, 43000, 50000],
      principal: [44000, 52000, 61000],
    }),
    openPositions: 844,
    competitionIndex: 24.1,
  },
  productManager: {
    roleKey: 'productManager',
    updatedAt: daysAgo(3),
    sources: sources(1290),
    topSkills: [
      marketSkill('sk-productstrategy', 'productManager', 84, 'stable', 2, 11, 402),
      marketSkill('sk-agile', 'productManager', 72, 'stable', 0, 4, 371),
      marketSkill('sk-userresearch', 'productManager', 63, 'up', 6, 8, 318),
      marketSkill('sk-roadmapping', 'productManager', 58, 'stable', 1, 5, 291),
      marketSkill('sk-sql', 'productManager', 44, 'up', 9, 13, 224),
      marketSkill('sk-jira', 'productManager', 41, 'stable', 0, 2, 208),
      marketSkill('sk-mixpanel', 'productManager', 33, 'up', 4, 6, 168),
      marketSkill('sk-figma', 'productManager', 29, 'up', 5, 4, 147),
      marketSkill('sk-communication', 'productManager', 27, 'stable', 1, 3, 138),
    ],
    salaryBySeniority: salaries({
      junior: [16000, 19000, 22500],
      mid: [22500, 27500, 32500],
      senior: [30000, 36000, 43000],
      lead: [39000, 45500, 53000],
      principal: [47000, 55000, 66000],
    }),
    openPositions: 366,
    competitionIndex: 31.7,
  },

  sales: {
    roleKey: 'sales',
    updatedAt: daysAgo(4),
    sources: sources(2140),
    topSkills: [
      marketSkill('sk-b2b', 'sales', 91, 'stable', 1, 14, 688),
      marketSkill('sk-crm', 'sales', 86, 'stable', 2, 6, 650),
      marketSkill('sk-pipeline', 'sales', 78, 'up', 7, 11, 590),
      marketSkill('sk-salesforce', 'sales', 71, 'stable', -1, 9, 537),
      marketSkill('sk-closing', 'sales', 64, 'stable', 0, 16, 484),
      marketSkill('sk-negotiation', 'sales', 59, 'up', 5, 12, 446),
      marketSkill('sk-outreach', 'sales', 54, 'down', -6, 4, 408),
      marketSkill('sk-forecasting', 'sales', 47, 'up', 8, 10, 355),
      marketSkill('sk-accountmgmt', 'sales', 43, 'stable', 1, 7, 325),
      marketSkill('sk-hubspot', 'sales', 31, 'up', 9, 3, 234),
    ],
    // Base salaries. Commission and OTE are excluded on purpose — mixing them in
    // would make these bands incomparable with the engineering roles above.
    salaryBySeniority: salaries({
      junior: [9000, 12000, 15000],
      mid: [16000, 21000, 26000],
      senior: [24000, 30000, 37000],
      lead: [32000, 39000, 47000],
      principal: [42000, 50000, 60000],
    }),
    openPositions: 756,
    competitionIndex: 38.4,
  },
};
