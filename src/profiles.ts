import type { Framework } from './types';
import { allRules } from './rules';
import type { Rule } from './types';

export const FRAMEWORK_LABELS: Record<Framework, string> = {
  react: 'React',
  next: 'Next.js',
  vite: 'Vite',
  remix: 'Remix',
};

export function getRulesForFramework(framework: Framework | undefined): Rule[] {
  if (!framework) return [...allRules];
  return allRules.filter((r) => r.frameworks.includes(framework));
}
