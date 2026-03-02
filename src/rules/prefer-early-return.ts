import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

function hasReturnInBothBranches(node: TSESTree.IfStatement): boolean {
  const consequent = node.consequent;
  const alternate = node.alternate;
  if (!alternate) return false;

  const hasReturn = (n: TSESTree.Node): boolean => {
    if (n.type === 'ReturnStatement') return true;
    if (n.type === 'BlockStatement') {
      return n.body.some((s) => hasReturn(s));
    }
    return false;
  };

  return hasReturn(consequent) && hasReturn(alternate);
}

const rule: Rule = {
  id: 'prefer-early-return',
  severity: 'warning',
  category: 'best-practice',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (node.type !== 'IfStatement') return;
      if (!hasReturnInBothBranches(node)) return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'prefer-early-return',
        severity: 'warning',
        category: 'best-practice',
        message: 'if/else both return — prefer early return to reduce nesting',
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: 'Use early return: if (!condition) return <Fallback />; return <Main />;',
        suggestions: [
          'Early returns make the main path clearer and reduce indentation',
        ],
      });
    });

    return out;
  },
};

export default rule;
