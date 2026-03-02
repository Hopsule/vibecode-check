import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

const FORM_TAGS = new Set(['input', 'select', 'textarea']);

function hasLabelOrAria(attrs: (TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute)[]): boolean {
  return attrs.some((a) => {
    if (a.type !== 'JSXAttribute' || a.name.type !== 'JSXIdentifier') return false;
    const n = a.name.name;
    return n === 'aria-label' || n === 'aria-labelledby' || n === 'id';
  });
}

function hasLabelAssociated(ast: TSESTree.Program, forId: string | null): boolean {
  if (!forId) return false;
  let found = false;
  traverse(ast, (node) => {
    if (
      node.type === 'JSXOpeningElement' &&
      node.name.type === 'JSXIdentifier' &&
      node.name.name === 'label'
    ) {
      const htmlFor = node.attributes.find(
        (a) =>
          a.type === 'JSXAttribute' &&
          a.name.type === 'JSXIdentifier' &&
          a.name.name === 'htmlFor'
      );
      if (htmlFor && htmlFor.type === 'JSXAttribute' && htmlFor.value?.type === 'Literal' && htmlFor.value.value === forId)
        found = true;
    }
  });
  return found;
}

const rule: Rule = {
  id: 'a11y-label',
  severity: 'warning',
  category: 'accessibility',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (node.type !== 'JSXOpeningElement' || node.name.type !== 'JSXIdentifier') return;
      if (!FORM_TAGS.has(node.name.name)) return;
      if (hasLabelOrAria(node.attributes)) return;

      const idAttr = node.attributes.find(
        (a) => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === 'id'
      );
      const id = idAttr?.type === 'JSXAttribute' && idAttr.value?.type === 'Literal'
        ? String(idAttr.value.value)
        : null;
      if (id && hasLabelAssociated(ast, id)) return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'a11y-label',
        severity: 'warning',
        category: 'accessibility',
        message: `<${node.name.name}> needs an accessible name (aria-label, aria-labelledby, or <label>)`,
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: 'Add aria-label="..." or wrap with <label> and use htmlFor.',
        suggestions: ['Screen readers need a name for form controls'],
      });
    });

    return out;
  },
};

export default rule;
