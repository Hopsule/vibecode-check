import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

function isUseRefCall(node: TSESTree.CallExpression): boolean {
  return (
    node.callee.type === 'Identifier' && node.callee.name === 'useRef'
  );
}

function hasInitialValueThatLooksLikeState(node: TSESTree.CallExpression): boolean {
  const [first] = node.arguments;
  if (!first) return false;
  if (first.type === 'Identifier') return true;
  if (first.type === 'ObjectExpression' && first.properties.length > 0) return true;
  return false;
}

const rule: Rule = {
  id: 'no-state-in-ref',
  severity: 'warning',
  category: 'correctness',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (node.type !== 'CallExpression' || !isUseRefCall(node)) return;
      if (!hasInitialValueThatLooksLikeState(node)) return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'no-state-in-ref',
        severity: 'warning',
        category: 'correctness',
        message: 'useRef with value that may need re-render — use useState if this value should trigger updates',
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: 'If the value drives UI or needs to trigger re-renders, use useState instead of useRef.',
        suggestions: [
          'useRef: for DOM refs or mutable values that should not trigger re-render',
          'useState: for values that affect what is rendered',
        ],
      });
    });

    return out;
  },
};

export default rule;
