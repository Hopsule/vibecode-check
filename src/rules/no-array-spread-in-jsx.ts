import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

type NodeWithParent = TSESTree.Node & { parent?: NodeWithParent };

function insideMapCallback(node: NodeWithParent): boolean {
  let cur: NodeWithParent | undefined = node;
  while (cur?.parent) {
    const p = cur.parent;
    if (p.type === 'CallExpression') {
      const callee = p.callee;
      if (
        callee.type === 'MemberExpression' &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'map'
      )
        return true;
    }
    cur = p;
  }
  return false;
}

const rule: Rule = {
  id: 'no-array-spread-in-jsx',
  severity: 'warning',
  category: 'performance',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (node.type !== 'JSXSpreadAttribute') return;
      if (!insideMapCallback(node as NodeWithParent)) return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'no-array-spread-in-jsx',
        severity: 'warning',
        category: 'performance',
        message: 'Spreading object into JSX — pass only needed props explicitly for clarity and performance',
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: 'Pass only the props the component needs: <Child id={item.id} name={item.name} />.',
        suggestions: [
          'Explicit props make dependencies clear and avoid passing unintended attributes',
        ],
      });
    });

    return out;
  },
};

export default rule;
