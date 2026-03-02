import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

const MIN_SETSTATE_IN_EFFECT = 2;

function isUseEffectNode(node: TSESTree.CallExpression): boolean {
  return (
    node.callee.type === 'Identifier' && node.callee.name === 'useEffect'
  );
}

function collectSetterNames(ast: TSESTree.Program): Set<string> {
  const setters = new Set<string>();
  traverse(ast, (node) => {
    if (
      node.type !== 'VariableDeclarator' ||
      node.id.type !== 'ArrayPattern' ||
      !node.init ||
      node.init.type !== 'CallExpression'
    )
      return;
    const init = node.init;
    const isUseState =
      (init.callee.type === 'Identifier' && init.callee.name === 'useState') ||
      (init.callee.type === 'MemberExpression' &&
        init.callee.object.type === 'Identifier' &&
        init.callee.object.name === 'React' &&
        init.callee.property.type === 'Identifier' &&
        init.callee.property.name === 'useState');
    if (!isUseState) return;
    const [, setterEl] = node.id.elements;
    if (setterEl?.type === 'Identifier') setters.add(setterEl.name);
  });
  return setters;
}

function isSetterCall(
  node: TSESTree.CallExpression,
  knownSetters: Set<string>
): boolean {
  if (node.callee.type !== 'Identifier') return false;
  const name = node.callee.name;
  if (knownSetters.size > 0) return knownSetters.has(name);
  return /^set[A-Z]/.test(name);
}

const rule: Rule = {
  id: 'effect-set-state',
  severity: 'warning',
  category: 'best-practice',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];
    const setterNames = collectSetterNames(ast);

    traverse(ast, (node) => {
      if (node.type !== 'CallExpression' || !isUseEffectNode(node)) return;
      const [callback] = node.arguments;
      if (!callback) return;

      const setStateCalls: TSESTree.CallExpression[] = [];
      traverse(callback, (inner) => {
        if (
          inner.type === 'CallExpression' &&
          isSetterCall(inner, setterNames)
        )
          setStateCalls.push(inner);
      });

      if (setStateCalls.length < MIN_SETSTATE_IN_EFFECT) return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'effect-set-state',
        severity: 'warning',
        category: 'best-practice',
        message: `${setStateCalls.length} setState calls in one useEffect — consider useReducer or a single state object`,
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: `Replace multiple setters with useReducer or one setState({ ...state, ...updates }).`,
        suggestions: [
          'useReducer keeps transitions in one place and avoids effect/state sync bugs',
        ],
      });
    });

    return out;
  },
};

export default rule;
