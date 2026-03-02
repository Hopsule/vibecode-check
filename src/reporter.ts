import pc from 'picocolors';
import type { Diagnostic, ScoreResult } from './types';
import type { Framework, Category } from './types';

const CATEGORY_LABELS: Record<Category, string> = {
  correctness: 'CORRECTNESS',
  performance: 'PERFORMANCE',
  accessibility: 'ACCESSIBILITY',
  'best-practice': 'BEST PRACTICE',
};

const CATEGORY_ORDER: Category[] = [
  'correctness',
  'performance',
  'accessibility',
  'best-practice',
];

function groupByCategory(diagnostics: Diagnostic[]): Map<Category, Diagnostic[]> {
  const map = new Map<Category, Diagnostic[]>();
  for (const cat of CATEGORY_ORDER) {
    map.set(cat, []);
  }
  for (const d of diagnostics) {
    map.get(d.category)!.push(d);
  }
  return map;
}

function groupByRule(diagnostics: Diagnostic[]): Map<string, Diagnostic[]> {
  const map = new Map<string, Diagnostic[]>();
  for (const d of diagnostics) {
    if (!map.has(d.ruleId)) map.set(d.ruleId, []);
    map.get(d.ruleId)!.push(d);
  }
  return map;
}

function sortRuleEntries(
  entries: [string, Diagnostic[]][]
): [string, Diagnostic[]][] {
  return [...entries].sort((a, b) => {
    const aErr = a[1].some((d) => d.severity === 'error') ? 0 : 1;
    const bErr = b[1].some((d) => d.severity === 'error') ? 0 : 1;
    if (aErr !== bErr) return aErr - bErr;
    return b[1].length - a[1].length;
  });
}

const BAR_WIDTH = 24;

function progressBar(score: number): string {
  const filled = Math.round((score / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export interface PrintHeaderOptions {
  version?: string;
  durationMs?: number;
}

export function printHeader(
  framework: Framework | undefined,
  totalFiles: number,
  options?: PrintHeaderOptions
): void {
  const fw = framework ? framework : 'detected';
  const version = options?.version ? ` v${options.version}` : '';
  let line = pc.bold('vibechecker' + version) + '  ·  ' + pc.cyan(fw) + '  ·  ' + pc.dim(`${totalFiles} files`);
  if (options?.durationMs != null && options.durationMs >= 0) {
    const sec = (options.durationMs / 1000).toFixed(1);
    line += '  ·  ' + pc.dim(`${sec}s`);
  }
  console.log(line);
  console.log();
}

export function printSummary(
  diagnostics: Diagnostic[],
  result: ScoreResult,
  options?: { showEmoji?: boolean; fixableCount?: number }
): void {
  if (diagnostics.length === 0) {
    console.log(pc.green('No issues found.'));
    return;
  }

  const byCategory = groupByCategory(diagnostics);
  const fixableCount = options?.fixableCount ?? diagnostics.filter((d) => d.autofix != null).length;

  const lineSep = '────────────────────────────────────────';
  console.log(lineSep);

  for (const cat of CATEGORY_ORDER) {
    const list = byCategory.get(cat)!;
    if (list.length === 0) continue;

    const catScore = result.scoreByCategory?.[cat] ?? 100;
    const scoreStr = `${catScore}/100`;
    const padding = 40 - CATEGORY_LABELS[cat].length - scoreStr.length;
    console.log('  ' + pc.bold(CATEGORY_LABELS[cat]) + ' '.repeat(Math.max(0, padding)) + pc.dim(scoreStr));

    const byRule = groupByRule(list);
    const sorted = sortRuleEntries([...byRule.entries()]);
    for (const [ruleId, ruleList] of sorted) {
      const first = ruleList[0]!;
      const icon = first.severity === 'error' ? pc.red('✗') : pc.yellow('⚠');
      const fixable = first.autofix ? pc.dim(' [fixable]') : '';
      console.log(`  ${icon}  ${ruleId} (${ruleList.length})${fixable}`);
      console.log(pc.dim(`    ${first.message}`));
    }
    console.log();
  }

  console.log(lineSep);
  console.log();
  console.log('  ' + pc.bold('OVERALL SCORE'));
  console.log();
  const bar = progressBar(result.score);
  const scoreColor =
    result.score >= 85 ? pc.green : result.score >= 70 ? pc.yellow : result.score >= 50 ? pc.yellow : pc.red;
  console.log('     ' + scoreColor(bar) + '  ' + result.score + ' / 100');
  console.log('     ' + pc.dim(result.label));
  if (result.labelDescription) {
    console.log('     ' + pc.dim(result.labelDescription));
  }
  console.log();
  const fixableLine =
    fixableCount > 0
      ? pc.cyan(`${fixableCount} fixable with --fix`) + '  ·  '
      : '';
  console.log('  ' + fixableLine + `${result.errors} errors  ·  ${result.warnings} warnings`);
  console.log();
  console.log(lineSep);
}

export function printVerbose(
  diagnostics: Diagnostic[],
  result: ScoreResult,
  options?: { fixableCount?: number }
): void {
  if (diagnostics.length === 0) {
    console.log(pc.green('No issues found.'));
    return;
  }

  const byCategory = groupByCategory(diagnostics);
  const fixableCount = options?.fixableCount ?? diagnostics.filter((d) => d.autofix != null).length;

  const lineSep = '────────────────────────────────────────';
  console.log(lineSep);

  for (const cat of CATEGORY_ORDER) {
    const list = byCategory.get(cat)!;
    if (list.length === 0) continue;

    const catScore = result.scoreByCategory?.[cat] ?? 100;
    const scoreStr = `${catScore}/100`;
    const padding = 40 - CATEGORY_LABELS[cat].length - scoreStr.length;
    console.log('  ' + pc.bold(CATEGORY_LABELS[cat]) + ' '.repeat(Math.max(0, padding)) + pc.dim(scoreStr));

    const byRule = groupByRule(list);
    const sorted = sortRuleEntries([...byRule.entries()]);
    for (const [ruleId, ruleList] of sorted) {
      const first = ruleList[0]!;
      const icon = first.severity === 'error' ? pc.red('✗') : pc.yellow('⚠');
      const fixable = first.autofix ? pc.dim(' [fixable]') : '';
      console.log(`  ${icon}  ${ruleId} (${ruleList.length})${fixable}`);
      console.log(pc.dim(`    ${first.message}`));
      for (const d of ruleList.slice(0, 5)) {
        console.log(pc.dim(`    ${d.filePath}:${d.line}:${d.column}`));
        if (d.codeSnippet.length > 0) {
          for (const snip of d.codeSnippet) console.log(pc.dim('      ' + snip));
        }
        if (d.fix) console.log(pc.green('    fix: ') + d.fix.split('\n')[0]);
      }
      if (ruleList.length > 5) {
        console.log(pc.dim(`    ... and ${ruleList.length - 5} more`));
      }
      console.log();
    }
    console.log();
  }

  console.log(lineSep);
  console.log();
  console.log('  ' + pc.bold('OVERALL SCORE'));
  console.log();
  const bar = progressBar(result.score);
  const scoreColor =
    result.score >= 85 ? pc.green : result.score >= 70 ? pc.yellow : result.score >= 50 ? pc.yellow : pc.red;
  console.log('     ' + scoreColor(bar) + '  ' + result.score + ' / 100');
  console.log('     ' + pc.dim(result.label));
  if (result.labelDescription) {
    console.log('     ' + pc.dim(result.labelDescription));
  }
  console.log();
  const fixableLine =
    fixableCount > 0
      ? pc.cyan(`${fixableCount} fixable with --fix`) + '  ·  '
      : '';
  console.log('  ' + fixableLine + `${result.errors} errors  ·  ${result.warnings} warnings`);
  console.log();
  console.log(lineSep);
}

export function formatJson(
  diagnostics: Diagnostic[],
  result: ScoreResult,
  totalFiles: number,
  framework: Framework | undefined
): string {
  return JSON.stringify(
    {
      score: result.score,
      label: result.label,
      labelDescription: result.labelDescription,
      errors: result.errors,
      warnings: result.warnings,
      totalFiles,
      framework: framework ?? null,
      scoreByCategory: result.scoreByCategory,
      byCategory: result.byCategory,
      diagnostics: diagnostics.map((d) => ({
        ruleId: d.ruleId,
        severity: d.severity,
        category: d.category,
        message: d.message,
        filePath: d.filePath,
        line: d.line,
        column: d.column,
        fix: d.fix,
        autofix: d.autofix != null,
      })),
    },
    null,
    2
  );
}

export function formatAiPrompt(
  diagnostics: Diagnostic[],
  result: ScoreResult,
  totalFiles: number,
  framework: Framework | undefined
): string {
  const lines: string[] = [
    `vibechecker report · ${framework ?? 'detected'} · ${totalFiles} files · score ${result.score} (${result.label})`,
    `${result.errors} errors, ${result.warnings} warnings`,
    '',
    '---',
    '',
  ];
  for (const d of diagnostics) {
    lines.push(`[${d.ruleId}] ${d.severity}: ${d.message}`);
    lines.push(`  ${d.filePath}:${d.line}:${d.column}`);
    if (d.codeSnippet.length > 0) {
      lines.push('  code:');
      for (const s of d.codeSnippet) lines.push('    ' + s);
    }
    if (d.fix) lines.push('  fix: ' + d.fix.replace(/\n/g, '\n    '));
    lines.push('');
  }
  return lines.join('\n');
}

export function printNoIssues(): void {
  console.log(pc.green('No issues found.'));
}

/** Shields.io badge color from score: 90+ green, 70+ yellow, 50+ orange, else red */
function badgeColor(score: number): string {
  if (score >= 90) return 'brightgreen';
  if (score >= 70) return 'yellow';
  if (score >= 50) return 'orange';
  return 'red';
}

/**
 * Returns markdown for a shields.io badge. Use in README: [![vibechecker](url)](url)
 */
export function formatBadge(result: ScoreResult): string {
  const score = result.score;
  const color = badgeColor(score);
  const message = `${score}%2F100`;
  const url = `https://img.shields.io/badge/vibechecker-${message}-${color}`;
  return `[![vibechecker score](${url})](https://github.com/Hopsule/vibechecker)`;
}

/**
 * Returns markdown body for a GitHub PR comment (e.g. from a workflow).
 */
export function formatCiComment(
  result: ScoreResult,
  totalFiles: number,
  framework: Framework | undefined
): string {
  const fw = framework ?? 'detected';
  const lines: string[] = [
    '## vibechecker',
    '',
    `**Score:** **${result.score}**/100 — ${result.label}`,
    '',
    `| | |`,
    `|---|---|`,
    `| Files | ${totalFiles} |`,
    `| Framework | ${fw} |`,
    `| Errors | ${result.errors} |`,
    `| Warnings | ${result.warnings} |`,
    '',
  ];
  return lines.join('\n');
}
