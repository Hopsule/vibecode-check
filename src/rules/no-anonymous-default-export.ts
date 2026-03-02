import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

function isAnonymous(node: TSESTree.ExportDefaultDeclaration): boolean {
  const decl = node.declaration;
  if (decl.type === 'FunctionDeclaration') {
    return !decl.id || !decl.id.name;
  }
  if (decl.type === 'ArrowFunctionExpression') return true;
  if (decl.type === 'FunctionExpression') {
    return !decl.id || !decl.id.name;
  }
  return false;
}

const rule: Rule = {
  id: 'no-anonymous-default-export',
  severity: 'warning',
  category: 'best-practice',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (node.type !== 'ExportDefaultDeclaration') return;
      if (!isAnonymous(node)) return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'no-anonymous-default-export',
        severity: 'warning',
        category: 'best-practice',
        message: 'Anonymous default export — name your component for React DevTools and stack traces',
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: 'Name the component: export default function MyComponent() {} or const MyComponent = () => {}; export default MyComponent;',
        suggestions: [
          'Named components show up correctly in React DevTools and error messages',
        ],
      });
    });

    return out;
  },
};

export default rule;
