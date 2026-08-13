import { asSkillId } from '@/types';
import type { Skill, SkillLevel, SkillRef } from '@/types';

const skill = (
  id: string,
  name: string,
  category: Skill['category'],
  aliases: string[] = [],
): Skill => ({ id: asSkillId(id), name, category, aliases });

export const SKILLS: readonly Skill[] = [
  skill('sk-ts', 'TypeScript', 'language', ['ts']),
  skill('sk-js', 'JavaScript', 'language', ['js', 'ecmascript']),
  skill('sk-python', 'Python', 'language', ['py']),
  skill('sk-go', 'Go', 'language', ['golang']),
  skill('sk-java', 'Java', 'language'),
  skill('sk-csharp', 'C#', 'language', ['dotnet']),
  skill('sk-sql', 'SQL', 'language'),
  skill('sk-bash', 'Bash', 'language', ['shell']),

  skill('sk-react', 'React', 'framework', ['reactjs']),
  skill('sk-nextjs', 'Next.js', 'framework'),
  skill('sk-node', 'Node.js', 'framework', ['nodejs']),
  skill('sk-nestjs', 'NestJS', 'framework'),
  skill('sk-django', 'Django', 'framework'),
  skill('sk-spring', 'Spring Boot', 'framework'),
  skill('sk-redux', 'Redux', 'framework'),
  skill('sk-graphql', 'GraphQL', 'framework'),

  skill('sk-aws', 'AWS', 'cloud'),
  skill('sk-gcp', 'GCP', 'cloud', ['google cloud']),
  skill('sk-azure', 'Azure', 'cloud'),
  skill('sk-k8s', 'Kubernetes', 'cloud', ['k8s']),
  skill('sk-docker', 'Docker', 'cloud', ['containers']),
  skill('sk-terraform', 'Terraform', 'cloud', ['iac']),
  skill('sk-argocd', 'ArgoCD', 'cloud'),
  skill('sk-helm', 'Helm', 'cloud'),

  skill('sk-postgres', 'PostgreSQL', 'tool', ['postgres']),
  skill('sk-mongo', 'MongoDB', 'tool'),
  skill('sk-redis', 'Redis', 'tool'),
  skill('sk-kafka', 'Kafka', 'tool'),
  skill('sk-git', 'Git', 'tool'),
  skill('sk-jenkins', 'Jenkins', 'tool'),
  skill('sk-githubactions', 'GitHub Actions', 'tool', ['gha']),
  skill('sk-prometheus', 'Prometheus', 'tool'),
  skill('sk-grafana', 'Grafana', 'tool'),
  skill('sk-datadog', 'Datadog', 'tool'),
  skill('sk-figma', 'Figma', 'tool'),
  skill('sk-jira', 'Jira', 'tool'),
  skill('sk-mixpanel', 'Mixpanel', 'tool'),

  skill('sk-agile', 'Agile', 'methodology', ['scrum']),
  skill('sk-cicd', 'CI/CD', 'methodology'),
  skill('sk-microservices', 'Microservices', 'methodology'),
  skill('sk-tdd', 'TDD', 'methodology'),
  skill('sk-a11y', 'Accessibility', 'methodology', ['a11y']),
  skill('sk-productstrategy', 'Product Strategy', 'methodology'),
  skill('sk-userresearch', 'User Research', 'methodology'),
  skill('sk-roadmapping', 'Roadmapping', 'methodology'),

  skill('sk-communication', 'Communication', 'soft'),
  skill('sk-mentoring', 'Mentoring', 'soft'),
  skill('sk-ownership', 'Ownership', 'soft'),
] as const;

const SKILL_BY_ID = new Map(SKILLS.map((entry) => [entry.id, entry]));

export const findSkill = (id: string): Skill => {
  const found = SKILL_BY_ID.get(asSkillId(id));
  if (found === undefined) {
    // Fixture authoring error — surface it loudly rather than rendering blanks.
    throw new Error(`Unknown skill id in mock data: ${id}`);
  }
  return found;
};

export const skillRef = (id: string, level?: SkillLevel, weight?: number): SkillRef => {
  const found = findSkill(id);
  return {
    skillId: found.id,
    name: found.name,
    ...(level === undefined ? {} : { level }),
    ...(weight === undefined ? {} : { weight }),
  };
};

export const skillRefs = (...ids: string[]): SkillRef[] => ids.map((id) => skillRef(id));
