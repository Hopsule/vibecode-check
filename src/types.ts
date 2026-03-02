import type { TSESTree } from '@typescript-eslint/typescript-estree';

export type Framework = 'react' | 'next' | 'vite' | 'remix';

export type Category =
  | 'correctness'
  | 'performance'
  | 'best-practice'
  | 'accessibility';

export interface Autofix {
  range: [number, number];
  text: string;
}

export interface Diagnostic {
  ruleId: string;
  severity: 'error' | 'warning';
  category: Category;
  message: string;
  filePath: string;
  line: number;
  column: number;
  codeSnippet: string[];
  fix: string;
  suggestions?: string[];
  autofix?: Autofix;
}

export interface Rule {
  id: string;
  severity: 'error' | 'warning';
  category: Category;
  frameworks: Framework[];
  check(
    ast: TSESTree.Program,
    filePath: string,
    sourceLines: string[]
  ): Diagnostic[];
}

export interface ScanResult {
  diagnostics: Diagnostic[];
  totalFiles: number;
  scannedFiles: string[];
}

export interface Config {
  ignore?: {
    rules?: string[];
    files?: string[];
  };
  strict?: boolean;
  /** @deprecated Use rules instead */
  severityOverrides?: Record<string, 'error' | 'warning' | 'off'>;
  /** Per-rule severity: off = disable, error | warning = override */
  rules?: Record<string, 'error' | 'warning' | 'off'>;
  /** Minimum score to pass: exit 1 if score < error; if strict and score < warn also exit 1 */
  thresholds?: { error?: number; warn?: number };
  /** Override category weights for scoring (e.g. { accessibility: 1.0 }) */
  categoryWeights?: Partial<Record<Category, number>>;
  /** Preset: strict = strict true + stricter defaults; relaxed = strict false + fewer rules */
  extends?: 'strict' | 'relaxed';
  showEmoji?: boolean;
}

export interface ScoreResult {
  score: number;
  label: string;
  labelDescription?: string;
  errors: number;
  warnings: number;
  affectedFiles: number;
  totalFiles: number;
  byCategory: Record<Category, number>;
  /** Per-category score 0–100 for each category */
  scoreByCategory: Record<Category, number>;
}
