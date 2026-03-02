import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

const MIN_USESTATE_COUNT = 4;

function isUseStateCall(node: TSESTree.CallExpression): boolean {
  if (node.callee.type === 'Identifier' && node.callee.name === 'useState')
    return true;
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'React' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'useState'
  )
    return true;
  return false;
}

function isComponentLike(node: TSESTree.Node): boolean {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}

function countTopLevelUseState(root: TSESTree.Node): number {
  let count = 0;
  const stack: TSESTree.Node[] = [root];
  const seen = new Set<TSESTree.Node>();
  while (stack.length > 0) {
    const n = stack.pop()!;
    if (!n || seen.has(n)) continue;
    seen.add(n);
    if (isComponentLike(n) && n !== root) continue;
    if (n.type === 'CallExpression' && isUseStateCall(n)) count++;
    const rec = n as Record<string, unknown>;
    for (const key of Object.keys(rec)) {
      if (['parent', 'loc', 'range', 'tokens', 'comments'].includes(key)) continue;
      const val = rec[key];
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === 'object' && 'type' in item) {
            const child = item as TSESTree.Node;
            if (isComponentLike(child) && child !== root) continue;
            stack.push(child);
          }
        }
      } else if (val && typeof val === 'object' && 'type' in val) {
        const child = val as TSESTree.Node;
        if (isComponentLike(child) && child !== root) continue;
        stack.push(child);
      }
    }
  }
  return count;
}

const rule: Rule = {
  id: 'merge-state-into-reducer',
  severity: 'warning',
  category: 'best-practice',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];
    const visited = new Set<TSESTree.Node>();

    traverse(ast, (node) => {
      if (!isComponentLike(node) || visited.has(node)) return;
      visited.add(node);
      const count = countTopLevelUseState(node);
      if (count < MIN_USESTATE_COUNT) return;

      const line = node.loc?.start.line ?? 1;
      const col = node.loc?.start.column ?? 0;
      out.push({
        ruleId: 'merge-state-into-reducer',
        severity: 'warning',
        category: 'best-practice',
        message: `${count} useState calls in one component — consider useReducer or a single state object`,
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: `Group related state: useReducer(reducer, initial) or useState({ field1, field2, ... }).`,
        suggestions: [
          'useReducer helps when multiple state updates happen together',
          'A single object + one setState reduces effect/state sync bugs',
        ],
      });
    });

    return out;
  },
};

export default rule;
