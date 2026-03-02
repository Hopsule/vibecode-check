import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

const EVENT_ATTRS = new Set([
  'onClick', 'onDoubleClick', 'onContextMenu',
  'onMouseDown', 'onMouseUp', 'onFocus', 'onBlur',
]);
const NEEDS_ROLE = new Set([
  'div', 'span', 'p', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav', 'ul', 'ol',
]);

function hasAttr(attrs: (TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute)[], name: string): boolean {
  return attrs.some(
    (a) =>
      a.type === 'JSXAttribute' &&
      a.name.type === 'JSXIdentifier' &&
      a.name.name === name
  );
}
function hasAnyAttr(attrs: (TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute)[], names: Set<string>): boolean {
  return attrs.some(
    (a) =>
      a.type === 'JSXAttribute' &&
      a.name.type === 'JSXIdentifier' &&
      names.has(a.name.name)
  );
}

const rule: Rule = {
  id: 'a11y-role',
  severity: 'warning',
  category: 'accessibility',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (node.type !== 'JSXOpeningElement' || node.name.type !== 'JSXIdentifier') return;
      if (!NEEDS_ROLE.has(node.name.name)) return;
      const attrs = node.attributes;
      if (!hasAnyAttr(attrs, EVENT_ATTRS)) return;
      if (hasAttr(attrs, 'role')) return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'a11y-role',
        severity: 'warning',
        category: 'accessibility',
        message: `Element with event handler should have role for screen readers`,
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: 'Add role="button" (or role="link", etc.) when the element is interactive.',
        suggestions: ['Assistive tech uses role to announce interactive elements'],
      });
    });

    return out;
  },
};

export default rule;
