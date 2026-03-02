import { Command } from 'commander';
import * as path from 'path';
import * as readline from 'readline';
import { execSync } from 'child_process';
import { scan } from './scanner';
import { computeScore } from './scorer';
import { applyFixes } from './fixer';
import { loadConfig, resolveIgnorePatterns, resolveIgnoredRules, resolveSeverityOverrides } from './config';
import { getRulesForFramework, FRAMEWORK_LABELS } from './profiles';
import {
  printHeader,
  printSummary,
  printNoIssues,
  printVerbose,
  formatJson,
  formatAiPrompt,
  formatBadge,
  formatCiComment,
} from './reporter';
import { ruleMap } from './rules';
import type { Framework } from './types';

const program = new Command();

function hasUncommittedChanges(dir: string): boolean {
  try {
    const out = execSync('git status --short', {
      encoding: 'utf-8',
      cwd: dir,
    });
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y|yes$/i.test(answer.trim()));
    });
  });
}

function detectFramework(cwd: string): Framework | undefined {
  try {
    const pkg = require(path.join(cwd, 'package.json'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies } || {};
    if (deps.next) return 'next';
    if (deps['@remix-run/react']) return 'remix';
    if (deps.vite) return 'vite';
    if (deps.react) return 'react';
  } catch {
    // no package.json or invalid
  }
  return undefined;
}

program
  .name('vibechecker')
  .description('React code health CLI with autofix — one command, actually fixes your code')
  .version(require(path.join(__dirname, '..', 'package.json')).version)
  .argument('[path]', 'Path to scan', '.')
  .option('--react', 'Use React profile')
  .option('--next', 'Use Next.js profile')
  .option('--vite', 'Use Vite profile')
  .option('--remix', 'Use Remix profile')
  .option('-r, --rule <id>', 'Run only one rule')
  .option('--list-rules', 'List rules for selected framework')
  .option('--fix', 'Apply autofixes to files')
  .option('--fix-dry-run', 'Show what would be fixed without writing')
  .option('-v, --verbose', 'Show file:line and snippet per issue')
  .option('--format <type>', 'Output format: default | json')
  .option('--ai', 'Output a single block for pasting into an AI assistant')
  .option('--badge', 'Output shields.io badge markdown for README')
  .option('--ci-comment', 'Output markdown for GitHub PR comment')
  .option('--strict', 'Exit 1 on warnings too (or set strict: true in config)')
  .action(async (targetPath: string) => {
    const opts = program.opts();
    const cwd = process.cwd();
    const resolvedPath = path.resolve(cwd, targetPath);

    const config = loadConfig(resolvedPath);
    const configIgnoreFiles = resolveIgnorePatterns(config);
    const configIgnoredRules = resolveIgnoredRules(config);

    let framework: Framework | undefined;
    if (opts.next) framework = 'next';
    else if (opts.react) framework = 'react';
    else if (opts.vite) framework = 'vite';
    else if (opts.remix) framework = 'remix';
    else framework = detectFramework(resolvedPath);

    if (opts.listRules) {
      const rules = getRulesForFramework(framework);
      const label = framework
        ? `Rules for ${FRAMEWORK_LABELS[framework]}`
        : 'All rules';
      console.log(`\n${label}\n`);
      for (const r of rules) {
        const icon = r.severity === 'error' ? '✗' : '⚠';
        console.log(`  ${icon} ${r.id}`);
      }
      console.log('');
      process.exit(0);
    }

    if (opts.rule && !ruleMap.has(opts.rule)) {
      console.error(`Unknown rule: ${opts.rule}. Use --list-rules to see rules.`);
      process.exit(1);
    }

    const startTime = performance.now();
    const { diagnostics, totalFiles } = await scan({
      targetPath: resolvedPath,
      framework,
      ruleId: opts.rule,
      configIgnoreFiles,
      configIgnoredRules,
    });

    const doFix = opts.fix === true;
    const dryRun = opts.fixDryRun === true;
    if (doFix || dryRun) {
      const withAutofix = diagnostics.filter((d) => d.autofix != null);
      if (withAutofix.length > 0) {
        if (doFix && !dryRun && hasUncommittedChanges(resolvedPath)) {
          if (process.stdout.isTTY) {
            const ok = await promptYesNo(
              'Uncommitted changes detected. Apply fixes anyway? (y/n) '
            );
            if (!ok) {
              console.log('Aborted.');
              process.exit(0);
            }
          } else {
            console.error(
              'Uncommitted changes detected. Commit or stash first, or run in a TTY to confirm.'
            );
            process.exit(1);
          }
        }
        const modified = applyFixes(diagnostics, { dryRun });
        if (dryRun && modified.size > 0) {
          console.log('Would apply autofix to:');
          for (const file of modified.keys()) console.log('  ', file);
        }
      }
    }

    const severityOverrides = resolveSeverityOverrides(config);
    for (const d of diagnostics) {
      const override = severityOverrides.get(d.ruleId);
      if (override) d.severity = override;
    }

    const scoreResult = computeScore(diagnostics, totalFiles, {
      categoryWeights: config?.categoryWeights,
    });
    const fixableCount = diagnostics.filter((d) => d.autofix != null).length;

    const format = opts.format as string | undefined;
    const ai = opts.ai === true;

    const strict = opts.strict === true || config?.strict === true;
    const thresholds = config?.thresholds;
    const failByErrors = scoreResult.errors > 0 || (strict && scoreResult.warnings > 0);
    const failByThreshold =
      (thresholds?.error != null && scoreResult.score < thresholds.error) ||
      (strict && thresholds?.warn != null && scoreResult.score < thresholds.warn);
    const fail = failByErrors || failByThreshold;

    if (format === 'json') {
      console.log(
        formatJson(diagnostics, scoreResult, totalFiles, framework)
      );
      process.exit(fail ? 1 : 0);
      return;
    }
    if (ai) {
      console.log(
        formatAiPrompt(diagnostics, scoreResult, totalFiles, framework)
      );
      process.exit(fail ? 1 : 0);
      return;
    }
    if (opts.badge === true) {
      console.log(formatBadge(scoreResult));
      process.exit(0);
      return;
    }
    if (opts.ciComment === true) {
      console.log(formatCiComment(scoreResult, totalFiles, framework));
      process.exit(fail ? 1 : 0);
      return;
    }

    let version: string | undefined;
    try {
      const pkg = require(path.join(__dirname, '..', 'package.json'));
      version = pkg.version;
    } catch {
      version = undefined;
    }
    printHeader(framework, totalFiles, {
      version,
      durationMs,
    });
    if (diagnostics.length === 0) {
      printNoIssues();
    } else if (opts.verbose) {
      printVerbose(diagnostics, scoreResult, { fixableCount });
    } else {
      printSummary(diagnostics, scoreResult, {
        showEmoji: config?.showEmoji ?? false,
        fixableCount,
      });
    }

    process.exit(fail ? 1 : 0);
  });

program.parse();
