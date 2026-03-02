import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

const HEAVY_MODULES: Record<string, string> = {
  moment: 'date-fns or dayjs',
  lodash: 'lodash-es (tree-shaken) or native',
  '@mui/material': 'tree-shake or import specific paths',
  recharts: 'lazy load with React.lazy',
  three: 'lazy load',
  'react-pdf': 'lazy load',
  'react-map-gl': 'lazy load',
  xlsx: 'lazy load or server-side',
  'monaco-editor': 'lazy load the editor',
  'highlight.js': 'lazy load or use react-syntax-highlighter',
};

const rule: Rule = {
  id: 'heavy-import',
  severity: 'warning',
  category: 'performance',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (node.type !== 'ImportDeclaration') return;
      if (node.importKind === 'type') return;
      const hasRuntime = node.specifiers.length === 0 ||
        node.specifiers.some(
          (s) => s.type !== 'ImportSpecifier' || s.importKind !== 'type'
        );
      if (!hasRuntime) return;

      const raw = node.source.value;
      const source = typeof raw === 'string' ? raw : '';
      const base = source.split('/')[0] ?? source;
      const suggestion = HEAVY_MODULES[base] ?? HEAVY_MODULES[source];
      if (!suggestion) return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      out.push({
        ruleId: 'heavy-import',
        severity: 'warning',
        category: 'performance',
        message: `Heavy import "${source}" — consider: ${suggestion}`,
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: `Use React.lazy(() => import('${source}')) and <Suspense> where possible.`,
        suggestions: ['Lazy loading reduces initial bundle size'],
      });
    });

    return out;
  },
};

export default rule;
