import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

const rule: Rule = {
  id: 'prefer-named-export',
  severity: 'warning',
  category: 'best-practice',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (node.type !== 'ExportDefaultDeclaration') return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'prefer-named-export',
        severity: 'warning',
        category: 'best-practice',
        message: 'Default export — prefer named export for better refactoring and tree-shaking',
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: 'Use named export: export function ComponentName() {} and import { ComponentName }.',
        suggestions: [
          'Named exports improve IDE refactoring and avoid ambiguous import names',
        ],
      });
    });

    return out;
  },
};

export default rule;
