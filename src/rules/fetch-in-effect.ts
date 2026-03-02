import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

function isUseEffect(node: TSESTree.CallExpression): boolean {
  return (
    node.callee.type === 'Identifier' && node.callee.name === 'useEffect'
  );
}

function isFetchCall(node: TSESTree.CallExpression): boolean {
  if (node.callee.type === 'Identifier' && node.callee.name === 'fetch')
    return true;
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    (node.callee.object.name === 'window' || node.callee.object.name === 'globalThis') &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'fetch'
  )
    return true;
  return false;
}

const rule: Rule = {
  id: 'fetch-in-effect',
  severity: 'error',
  category: 'correctness',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (node.type !== 'CallExpression' || !isUseEffect(node)) return;
      const [callback] = node.arguments;
      if (!callback) return;

      traverse(callback, (inner) => {
        if (inner.type !== 'CallExpression' || !isFetchCall(inner)) return;
        const line = inner.loc!.start.line;
        const col = inner.loc!.start.column;
        out.push({
          ruleId: 'fetch-in-effect',
          severity: 'error',
          category: 'correctness',
          message:
            'fetch() inside useEffect — prefer a data-fetching library or server-side fetch',
          filePath,
          line,
          column: col,
          codeSnippet: getCodeSnippet(sourceLines, line),
          fix: `Use a data-fetching library (e.g. TanStack Query or SWR) or move fetch to a Server Component / loader.`,
          suggestions: [
            'TanStack Query: useQuery({ queryKey, queryFn: () => fetch(...) })',
            'SWR: useSWR(key, fetcher)',
          ],
        });
      });
    });

    return out;
  },
};

export default rule;
