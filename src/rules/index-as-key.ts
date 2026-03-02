import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

function hasItemIdUsage(callback: TSESTree.Node, itemParamName: string): boolean {
  let found = false;
  traverse(callback, (node) => {
    if (
      node.type === 'MemberExpression' &&
      node.object.type === 'Identifier' &&
      node.object.name === itemParamName &&
      node.property.type === 'Identifier' &&
      node.property.name === 'id'
    )
      found = true;
  });
  return found;
}

const rule: Rule = {
  id: 'index-as-key',
  severity: 'warning',
  category: 'best-practice',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (
        node.type !== 'CallExpression' ||
        node.callee.type !== 'MemberExpression' ||
        node.callee.property.type !== 'Identifier' ||
        node.callee.property.name !== 'map'
      )
        return;

      const [callback] = node.arguments;
      if (
        !callback ||
        (callback.type !== 'ArrowFunctionExpression' &&
          callback.type !== 'FunctionExpression')
      )
        return;

      const params = callback.params;
      if (params.length < 2) return;
      const first = params[0];
      const second = params[1];
      if (first?.type !== 'Identifier' || second?.type !== 'Identifier') return;
      const itemName = first.name;
      const indexName = second.name;

      traverse(callback, (child) => {
        if (
          child.type !== 'JSXAttribute' ||
          child.name.type !== 'JSXIdentifier' ||
          child.name.name !== 'key' ||
          child.value?.type !== 'JSXExpressionContainer'
        )
          return;
        const expr = child.value.expression;
        if (expr.type !== 'Identifier' || expr.name !== indexName) return;

        const line = child.loc!.start.line;
        const col = child.loc!.start.column;
        const useItemId = hasItemIdUsage(callback, itemName);
        const range = expr.range;

        out.push({
          ruleId: 'index-as-key',
          severity: 'warning',
          category: 'best-practice',
          message: `key={${indexName}} uses array index — use a stable id (e.g. ${itemName}.id)`,
          filePath,
          line,
          column: col,
          codeSnippet: getCodeSnippet(sourceLines, line),
          fix: `Use a stable id from the item: key={${itemName}.id} or key={\`${itemName}-\${${itemName}.id}\`}.`,
          suggestions: [
            'Index as key can cause wrong reuse when list order or length changes',
          ],
          ...(useItemId &&
            range && {
              autofix: {
                range: [range[0], range[1]],
                text: `${itemName}.id`,
              },
            }),
        });
      });
    });

    return out;
  },
};

export default rule;
