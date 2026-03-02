import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

const rule: Rule = {
  id: 'no-inline-styles',
  severity: 'warning',
  category: 'best-practice',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (node.type !== 'JSXAttribute') return;
      if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'style') return;
      if (node.value?.type !== 'JSXExpressionContainer') return;
      const expr = node.value.expression;
      if (expr.type !== 'ObjectExpression') return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'no-inline-styles',
        severity: 'warning',
        category: 'best-practice',
        message: 'Inline style object — extract to CSS module or styled component',
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: 'Extract to a CSS module (styles.module.css) or use a styled component / Tailwind class.',
        suggestions: [
          'CSS modules: import styles from "./Component.module.css"; className={styles.foo}',
          'Tailwind: use utility classes instead of style={{}}',
        ],
      });
    });

    return out;
  },
};

export default rule;
