import fg from 'fast-glob';
import * as path from 'path';
import { parseFile, isParseFailure } from './parser';
import { allRules, ruleMap } from './rules';
import { getRulesForFramework } from './profiles';
import type { Diagnostic, Framework } from './types';
import { resolveIgnorePatterns, resolveIgnoredRules } from './config';

const GLOB_PATTERNS = ['**/*.tsx', '**/*.ts', '**/*.jsx', '**/*.js'];
const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/*.d.ts',
];

export interface ScanOptions {
  targetPath: string;
  framework?: Framework;
  ruleId?: string;
  configIgnoreFiles?: string[];
  configIgnoredRules?: Set<string>;
}

export interface ScanResult {
  diagnostics: Diagnostic[];
  totalFiles: number;
  scannedFiles: string[];
}

function dedupe(diagnostics: Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((d) => {
    const key = `${d.ruleId}::${d.filePath}::${d.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function scan(options: ScanOptions): Promise<ScanResult> {
  const {
    targetPath,
    framework,
    ruleId,
    configIgnoreFiles = [],
    configIgnoredRules = new Set(),
  } = options;

  const rules = ruleId
    ? (() => {
        const r = ruleMap.get(ruleId);
        return r ? [r] : [];
      })()
    : getRulesForFramework(framework);

  const ignoreList = [...DEFAULT_IGNORE, ...configIgnoreFiles];

  const files = await fg(GLOB_PATTERNS, {
    cwd: path.resolve(targetPath),
    absolute: true,
    ignore: ignoreList,
  });

  const diagnostics: Diagnostic[] = [];

  for (const filePath of files) {
    const result = parseFile(filePath);

    if (isParseFailure(result)) {
      diagnostics.push({
        ruleId: 'parse-error',
        severity: 'warning',
        category: 'correctness',
        message: 'File could not be parsed — syntax or unsupported construct',
        filePath,
        line: result.parseError.line,
        column: 0,
        codeSnippet: [],
        fix: `// ${result.parseError.message}`,
      });
      continue;
    }

    if (!result) continue;

    const { ast, sourceLines } = result;

    for (const rule of rules) {
      if (configIgnoredRules.has(rule.id)) continue;
      const list = rule.check(ast, filePath, sourceLines);
      diagnostics.push(...list);
    }
  }

  return {
    diagnostics: dedupe(diagnostics),
    totalFiles: files.length,
    scannedFiles: files,
  };
}
