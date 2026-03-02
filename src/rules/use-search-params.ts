import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

const rule: Rule = {
  id: 'use-search-params',
  severity: 'warning',
  category: 'correctness',
  frameworks: ['next'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (
        node.type !== 'CallExpression' ||
        node.callee.type !== 'Identifier' ||
        node.callee.name !== 'useSearchParams'
      )
        return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'use-search-params',
        severity: 'warning',
        category: 'correctness',
        message:
          'useSearchParams() should be used inside a <Suspense> boundary in Next.js',
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: `Wrap this component (or a parent) in <Suspense fallback={...}> so Next.js can stream correctly.`,
        suggestions: [
          'Next.js docs: useSearchParams causes client-side rendering; Suspense avoids blocking the shell',
        ],
      });
    });

    return out;
  },
};

export default rule;
