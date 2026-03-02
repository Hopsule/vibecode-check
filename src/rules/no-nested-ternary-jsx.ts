import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

function isNestedTernary(node: TSESTree.ConditionalExpression): boolean {
  return (
    node.consequent.type === 'ConditionalExpression' ||
    node.alternate.type === 'ConditionalExpression'
  );
}

const rule: Rule = {
  id: 'no-nested-ternary-jsx',
  severity: 'warning',
  category: 'best-practice',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (node.type !== 'ConditionalExpression') return;
      if (!isNestedTernary(node)) return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'no-nested-ternary-jsx',
        severity: 'warning',
        category: 'best-practice',
        message: 'Nested ternary in JSX — extract to a helper or use early return',
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: 'Extract to a helper function (e.g. getLabel()) or use if/else with early return.',
        suggestions: [
          'Helper: function getContent() { if (a) return X; if (b) return Y; return Z; }',
          'Early return in component: if (!a) return null; return <X />;',
        ],
      });
    });

    return out;
  },
};

export default rule;
