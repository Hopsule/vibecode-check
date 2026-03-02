import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

const MOUSE_HANDLERS = new Set(['onClick', 'onDoubleClick', 'onContextMenu']);
const KEY_HANDLERS = new Set(['onKeyDown', 'onKeyUp', 'onKeyPress']);
const NON_INTERACTIVE = new Set([
  'div', 'span', 'p', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav',
]);

function hasAny(attrs: (TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute)[], names: Set<string>): boolean {
  return attrs.some(
    (a) =>
      a.type === 'JSXAttribute' &&
      a.name.type === 'JSXIdentifier' &&
      names.has(a.name.name)
  );
}

const rule: Rule = {
  id: 'a11y-interactive',
  severity: 'warning',
  category: 'accessibility',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (node.type !== 'JSXOpeningElement' || node.name.type !== 'JSXIdentifier') return;
      if (!NON_INTERACTIVE.has(node.name.name)) return;
      const attrs = node.attributes;
      if (!hasAny(attrs, MOUSE_HANDLERS)) return;
      if (hasAny(attrs, KEY_HANDLERS)) return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'a11y-interactive',
        severity: 'warning',
        category: 'accessibility',
        message: `<${node.name.name}> has click handler but no keyboard handler — add onKeyDown/onKeyPress for accessibility`,
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: 'Add onKeyDown (e.g. Enter/Space to activate) or use a semantic element like <button>.',
        suggestions: ['Keyboard users need a way to activate the same action'],
      });
    });

    return out;
  },
};

export default rule;
