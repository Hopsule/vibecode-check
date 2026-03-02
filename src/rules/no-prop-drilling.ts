import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

const PROP_COUNT_THRESHOLD = 4;

function getParamCount(node: TSESTree.Node): number {
  if (node.type === 'FunctionDeclaration' && node.params) {
    if (node.params.length === 1 && node.params[0].type === 'Identifier') return 0;
    if (node.params.length === 1 && node.params[0].type === 'ObjectPattern') {
      const obj = node.params[0];
      return obj.properties.length;
    }
    return node.params.length;
  }
  if (node.type === 'ArrowFunctionExpression' && node.params) {
    if (node.params.length === 1 && node.params[0].type === 'ObjectPattern') {
      return node.params[0].properties.length;
    }
    return node.params.length;
  }
  if (node.type === 'FunctionExpression' && node.params) {
    if (node.params.length === 1 && node.params[0].type === 'ObjectPattern') {
      return node.params[0].properties.length;
    }
    return node.params.length;
  }
  return 0;
}

function isComponentLike(node: TSESTree.Node): boolean {
  if (node.type === 'FunctionDeclaration' && node.id?.type === 'Identifier') {
    return /^[A-Z]/.test(node.id.name);
  }
  if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
    return /^[A-Z]/.test(node.id.name);
  }
  return false;
}

const rule: Rule = {
  id: 'no-prop-drilling',
  severity: 'warning',
  category: 'best-practice',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (
        node.type !== 'FunctionDeclaration' &&
        node.type !== 'ArrowFunctionExpression' &&
        node.type !== 'FunctionExpression'
      )
        return;

      const paramCount = getParamCount(node);
      if (paramCount < PROP_COUNT_THRESHOLD) return;

      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      const isComponent =
        isComponentLike(node) ||
        (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier' && /^[A-Z]/.test(parent.id.name));
      if (!isComponent) return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'no-prop-drilling',
        severity: 'warning',
        category: 'best-practice',
        message: `Component receives ${paramCount}+ props — consider React Context or state library to avoid prop drilling`,
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: 'Consider React.createContext or a state library (Zustand, Jotai) for deeply passed data.',
        suggestions: [
          'Context: for theme, auth, or locale that many components need',
          'State library: for shared mutable state without passing through every level',
        ],
      });
    });

    return out;
  },
};

export default rule;
