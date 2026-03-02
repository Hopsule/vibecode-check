import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

const CLIENT_HOOK_NAMES = new Set([
  'useState',
  'useEffect',
  'useReducer',
  'useCallback',
  'useMemo',
  'useRef',
  'useContext',
  'useLayoutEffect',
  'useTransition',
  'useDeferredValue',
  'useId',
]);

function fileHasUseClient(ast: TSESTree.Program): boolean {
  for (const stmt of ast.body) {
    if (stmt.type !== 'ExpressionStatement') continue;
    const expr = stmt.expression;
    if (expr.type === 'Literal' && expr.value === 'use client') return true;
  }
  return false;
}

function isAppRouterPath(filePath: string): boolean {
  return /[/\\]app[/\\]/.test(filePath);
}

function findImportedHookNames(ast: TSESTree.Program): Set<string> {
  const names = new Set<string>();
  for (const stmt of ast.body) {
    if (stmt.type !== 'ImportDeclaration') continue;
    if (stmt.source.type !== 'Literal' || stmt.source.value !== 'react') continue;
    for (const spec of stmt.specifiers) {
      if (spec.type === 'ImportSpecifier') {
        const name =
          spec.imported.type === 'Identifier'
            ? spec.imported.name
            : String((spec.imported as TSESTree.Literal).value);
        if (CLIENT_HOOK_NAMES.has(name)) names.add(spec.local.name);
      }
    }
  }
  return names;
}

const rule: Rule = {
  id: 'missing-use-client',
  severity: 'error',
  category: 'correctness',
  frameworks: ['next'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    if (!isAppRouterPath(filePath)) return [];
    if (fileHasUseClient(ast)) return [];

    const hookLocals = findImportedHookNames(ast);

    function isHookCall(node: TSESTree.CallExpression): boolean {
      if (node.callee.type === 'Identifier' && hookLocals.has(node.callee.name))
        return true;
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        node.callee.object.name === 'React' &&
        node.callee.property.type === 'Identifier' &&
        CLIENT_HOOK_NAMES.has(node.callee.property.name)
      )
        return true;
      return false;
    }

    const hits: TSESTree.CallExpression[] = [];
    traverse(ast, (node) => {
      if (node.type === 'CallExpression' && isHookCall(node)) hits.push(node);
    });

    if (hits.length === 0) return [];

    const first = hits[0]!;
    const line = first.loc!.start.line;
    const column = first.loc!.start.column;
    const hookName =
      first.callee.type === 'Identifier'
        ? first.callee.name
        : (first.callee as TSESTree.MemberExpression).property.type ===
            'Identifier'
          ? (first.callee as TSESTree.MemberExpression).property.name
          : 'hook';

    return [
      {
        ruleId: 'missing-use-client',
        severity: 'error',
        category: 'correctness',
        message: `${hookName}() used without "use client" — App Router treats this as a Server Component`,
        filePath,
        line,
        column,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: `Add at the very top of the file (before any imports):\n'use client';\n`,
        suggestions: [
          'Server Components cannot use hooks. Add "use client" or move this logic to a Client Component.',
        ],
        autofix: {
          range: [0, 0],
          text: "'use client';\n",
        },
      },
    ];
  },
};

export default rule;
