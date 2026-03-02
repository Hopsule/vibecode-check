import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

function hasSrc(open: TSESTree.JSXOpeningElement): boolean {
  return open.attributes.some(
    (a) =>
      a.type === 'JSXAttribute' &&
      a.name.type === 'JSXIdentifier' &&
      a.name.name === 'src'
  );
}

const rule: Rule = {
  id: 'img-not-optimized',
  severity: 'warning',
  category: 'performance',
  frameworks: ['next'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (
        node.type !== 'JSXOpeningElement' ||
        node.name.type !== 'JSXIdentifier' ||
        node.name.name !== 'img'
      )
        return;
      if (!hasSrc(node)) return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'img-not-optimized',
        severity: 'warning',
        category: 'performance',
        message: 'Use next/image instead of <img> for optimization and lazy loading',
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: `import Image from 'next/image'; then <Image src="..." alt="..." width={...} height={...} />`,
        suggestions: ['next/image adds WebP, sizing, and lazy loading by default'],
      });
    });

    return out;
  },
};

export default rule;
