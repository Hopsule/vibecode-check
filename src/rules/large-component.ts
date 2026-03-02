import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

const MAX_LINES = 300;
const MAX_HOOKS = 8;
const MAX_JSX = 35;

function isFunctionComponent(node: TSESTree.Node): boolean {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}

function getComponentName(node: TSESTree.Node): string | null {
  if (node.type === 'FunctionDeclaration' && node.id) return node.id.name;
  const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
  if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier')
    return parent.id.name;
  return null;
}

function isPascalCase(name: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

function countHooksIn(fn: TSESTree.Node): number {
  let n = 0;
  traverse(fn, (node) => {
    if (isFunctionComponent(node) && node !== fn) return;
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      /^use[A-Z]/.test(node.callee.name)
    )
      n++;
  });
  return n;
}

function countJSXIn(fn: TSESTree.Node): number {
  let n = 0;
  traverse(fn, (node) => {
    if (node.type === 'JSXElement') n++;
  });
  return n;
}

const rule: Rule = {
  id: 'large-component',
  severity: 'warning',
  category: 'performance',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];
    const visited = new Set<TSESTree.Node>();

    traverse(ast, (node) => {
      if (!isFunctionComponent(node) || visited.has(node)) return;
      visited.add(node);
      if (!node.loc) return;

      const name = getComponentName(node);
      if (!name || !isPascalCase(name)) return;

      const lines = node.loc.end.line - node.loc.start.line + 1;
      if (lines < MAX_LINES) return;

      const hooks = countHooksIn(node);
      const jsx = countJSXIn(node);
      const line = node.loc.start.line;
      const col = node.loc.start.column;
      out.push({
        ruleId: 'large-component',
        severity: 'warning',
        category: 'performance',
        message: `Component "${name}" is ${lines} lines (${hooks} hooks, ${jsx} JSX) — consider splitting`,
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: `Extract sub-components or a use${name}Logic() hook; aim for < ${MAX_LINES} lines.`,
        suggestions: [
          'Extract sections into smaller components',
          'Move state and effects into a custom hook',
        ],
      });
    });

    return out;
  },
};

export default rule;
