import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

const EVENT_FLAG_PATTERNS = [
  /^(is|has)(Open|Visible|Clicked|Submitted|Pressed|Triggered|Fired|Called)/i,
  /^on[A-Z]\w*$/,
  /^(clicked|submitted|toggled|triggered|fired|opened)$/i,
];

function looksLikeEventFlag(name: string): boolean {
  return EVENT_FLAG_PATTERNS.some((p) => p.test(name));
}

function isUseEffectCall(node: TSESTree.CallExpression): boolean {
  return (
    node.callee.type === 'Identifier' && node.callee.name === 'useEffect'
  );
}

const rule: Rule = {
  id: 'effect-as-handler',
  severity: 'warning',
  category: 'best-practice',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (node.type !== 'CallExpression' || !isUseEffectCall(node)) return;
      const depsArg = node.arguments[1];
      if (!depsArg || depsArg.type !== 'ArrayExpression') return;
      const elements = depsArg.elements;
      if (elements.length !== 1) return;

      const dep = elements[0];
      if (!dep || dep.type !== 'Identifier') return;
      if (!looksLikeEventFlag(dep.name)) return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'effect-as-handler',
        severity: 'warning',
        category: 'best-practice',
        message: `useEffect depends on "${dep.name}" — run this logic in the event handler instead`,
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: `Move the effect body into the handler that sets ${dep.name} (e.g. onClick or onSubmit).`,
        suggestions: [
          'Effects are for syncing with external systems; user events belong in handlers',
        ],
      });
    });

    return out;
  },
};

export default rule;
