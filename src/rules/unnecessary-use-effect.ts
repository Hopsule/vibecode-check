import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

function isUseEffectCall(node: TSESTree.CallExpression): boolean {
  return (
    node.callee.type === 'Identifier' && node.callee.name === 'useEffect'
  );
}

function countSetterCallsIn(body: TSESTree.Node, setterNames: Set<string>): number {
  let n = 0;
  traverse(body, (node) => {
    if (node.type !== 'CallExpression') return;
    if (node.callee.type !== 'Identifier') return;
    if (setterNames.has(node.callee.name)) n++;
  });
  return n;
}

function collectSetterNames(ast: TSESTree.Program): Set<string> {
  const s = new Set<string>();
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
    const [, setter] = node.id.elements;
    if (setter?.type === 'Identifier') s.add(setter.name);
  });
  return s;
}

const rule: Rule = {
  id: 'unnecessary-use-effect',
  severity: 'warning',
  category: 'best-practice',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];
    const setterNames = collectSetterNames(ast);

    traverse(ast, (node) => {
      if (node.type !== 'CallExpression' || !isUseEffectCall(node)) return;
      const [callback, depsNode] = node.arguments;
      if (!callback) return;
      if (!depsNode || depsNode.type !== 'ArrayExpression') return;
      const deps = depsNode.elements;
      if (deps.length !== 1) return;

      const dep = deps[0];
      if (!dep || dep.type !== 'Identifier') return;
      const depName = dep.name;
      const setterCount = countSetterCallsIn(callback, setterNames);

      const looksLikeEventFlag =
        /^(is|has)(Open|Visible|Clicked|Submitted|Pressed|Triggered|Fired)/i.test(depName) ||
        /^on[A-Z]/.test(depName) ||
        /^(clicked|submitted|toggled|opened)$/i.test(depName);

      if (looksLikeEventFlag || (setterCount === 1 && deps.length === 1)) {
        const line = node.loc!.start.line;
        const col = node.loc!.start.column;
        const hint = looksLikeEventFlag
          ? `Effect depends only on "${depName}" — move logic into the event handler`
          : 'Effect only syncs one value to state — prefer a derived value or initial state';
        out.push({
          ruleId: 'unnecessary-use-effect',
          severity: 'warning',
          category: 'best-practice',
          message: hint,
          filePath,
          line,
          column: col,
          codeSnippet: getCodeSnippet(sourceLines, line),
          fix: `Prefer deriving state or running the logic in the handler that sets the dependency.`,
          suggestions: [
            'Derived state: const value = useMemo(() => compute(prop), [prop]);',
            'Event: run the logic inside onClick/onSubmit instead of in useEffect.',
          ],
        });
      }
    });

    return out;
  },
};

export default rule;
