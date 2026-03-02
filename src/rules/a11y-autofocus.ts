import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

const rule: Rule = {
  id: 'a11y-autofocus',
  severity: 'warning',
  category: 'accessibility',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (
        node.type !== 'JSXAttribute' ||
        node.name.type !== 'JSXIdentifier' ||
        node.name.name !== 'autoFocus'
      )
        return;
      if (
        node.value?.type === 'JSXExpressionContainer' &&
        node.value.expression.type === 'Literal' &&
        node.value.expression.value === false
      )
        return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'a11y-autofocus',
        severity: 'warning',
        category: 'accessibility',
        message: 'autoFocus can hurt screen reader and keyboard users',
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: 'Prefer focusing via ref after a user action (e.g. when opening a modal).',
        suggestions: ['Use a ref + focus() in useEffect when the context is appropriate'],
      });
    });

    return out;
  },
};

export default rule;
