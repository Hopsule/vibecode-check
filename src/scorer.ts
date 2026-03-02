import type { Diagnostic, Category, ScoreResult } from './types';

const CATEGORY_WEIGHT: Record<Category, number> = {
  correctness: 2.0,
  performance: 1.2,
  accessibility: 1.5,
  'best-practice': 1.0,
};

const LABELS: [number, string, string][] = [
  [95, 'Pristine', 'Your code is mass'],
  [85, 'Excellent', 'Very clean codebase'],
  [70, 'Solid', 'Some issues to address'],
  [50, 'Needs Work', 'Significant improvements needed'],
  [25, 'Rough', 'Major issues detected'],
  [0, 'Critical', 'Immediate attention required'],
];

const ERROR_PENALTY = 5;
const WARNING_PENALTY = 1;

function getWeights(
  overrides?: Partial<Record<Category, number>>
): Record<Category, number> {
  if (!overrides) return CATEGORY_WEIGHT;
  return { ...CATEGORY_WEIGHT, ...overrides };
}

function weightedPenalty(
  diagnostics: Diagnostic[],
  weights: Record<Category, number>
): number {
  let sum = 0;
  for (const d of diagnostics) {
    const base = d.severity === 'error' ? ERROR_PENALTY : WARNING_PENALTY;
    sum += base * (weights[d.category] ?? 1);
  }
  return sum;
}

function categoryScore(
  diagnostics: Diagnostic[],
  category: Category,
  weights: Record<Category, number>
): number {
  const inCategory = diagnostics.filter((d) => d.category === category);
  const penalty = weightedPenalty(inCategory, weights);
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

export interface ComputeScoreOptions {
  categoryWeights?: Partial<Record<Category, number>>;
}

export function computeScore(
  diagnostics: Diagnostic[],
  totalFiles: number,
  options?: ComputeScoreOptions
): ScoreResult {
  const weights = getWeights(options?.categoryWeights);
  const errors = diagnostics.filter((d) => d.severity === 'error').length;
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length;
  const affectedFiles = new Set(diagnostics.map((d) => d.filePath)).size;

  let penalty = weightedPenalty(diagnostics, weights);

  // File-based normalization: more affected files = proportionally worse impact
  if (totalFiles > 0 && affectedFiles > 0) {
    const fileFactor = 1 + Math.log10(affectedFiles / totalFiles + 0.01);
    penalty *= Math.max(0.5, Math.min(2, fileFactor));
  }

  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  let label = 'Critical';
  let labelDescription = 'Immediate attention required';
  for (const [min, name, desc] of LABELS) {
    if (score >= min) {
      label = name;
      labelDescription = desc;
      break;
    }
  }

  const byCategory: Record<Category, number> = {
    correctness: 0,
    performance: 0,
    'best-practice': 0,
    accessibility: 0,
  };
  for (const d of diagnostics) {
    byCategory[d.category]++;
  }

  const categories: Category[] = [
    'correctness',
    'performance',
    'best-practice',
    'accessibility',
  ];
  const scoreByCategory = {} as Record<Category, number>;
  for (const cat of categories) {
    scoreByCategory[cat] = categoryScore(diagnostics, cat, weights);
  }

  return {
    score,
    label,
    labelDescription,
    errors,
    warnings,
    affectedFiles,
    totalFiles,
    byCategory,
    scoreByCategory,
  };
}
