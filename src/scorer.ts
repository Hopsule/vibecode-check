import type { Diagnostic, Category, ScoreResult } from './types';

const CATEGORY_WEIGHT: Record<Category, number> = {
  correctness: 2.0,
  performance: 1.2,
  accessibility: 1.5,
  'best-practice': 1.0,
};

const LABELS: [number, string, string][] = [
  [90, 'Pristine', 'Your code is in great shape'],
  [80, 'Excellent', 'Very clean codebase'],
  [65, 'Solid', 'Some issues to address'],
  [50, 'Needs Work', 'Significant improvements needed'],
  [30, 'Rough', 'Major issues detected'],
  [0, 'Critical', 'Immediate attention required'],
];

const ERROR_PENALTY = 5;
const WARNING_PENALTY = 1;

/** Score scale: effective penalty per file × this ≈ points deducted. ~1 issue/file → ~15 pts, ~3 → ~36 pts */
const PENALTY_PER_FILE_SCALE = 12;

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

/**
 * Normalized score 0–100 for a set of diagnostics.
 * Uses penalty per file (by totalFiles) so large codebases aren't unfairly crushed.
 */
function normalizedScore(
  penalty: number,
  totalFiles: number
): number {
  if (totalFiles <= 0) return 100;
  const effectivePenalty = penalty / totalFiles;
  const deduction = effectivePenalty * PENALTY_PER_FILE_SCALE;
  return Math.max(0, Math.min(100, Math.round(100 - deduction)));
}

function categoryScore(
  diagnostics: Diagnostic[],
  category: Category,
  weights: Record<Category, number>,
  totalFiles: number
): number {
  const inCategory = diagnostics.filter((d) => d.category === category);
  const penalty = weightedPenalty(inCategory, weights);
  return normalizedScore(penalty, totalFiles);
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

  const penalty = weightedPenalty(diagnostics, weights);
  const score = normalizedScore(penalty, Math.max(1, totalFiles));

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
    scoreByCategory[cat] = categoryScore(diagnostics, cat, weights, Math.max(1, totalFiles));
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
