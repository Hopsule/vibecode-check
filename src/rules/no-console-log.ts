import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

type NodeWithParent = TSESTree.Node & { parent?: NodeWithParent };

function insideDevGuard(node: TSESTree.Node): boolean {
  let cur: NodeWithParent | undefined = node as NodeWithParent;
  while (cur?.parent) {
    const p = cur.parent as NodeWithParent;
    if (
      p.type === 'IfStatement' &&
      p.test.type === 'Identifier' &&
      p.test.name === '__DEV__'
    )
      return true;
    cur = p;
  }
  return false;
}

function lineRange(sourceLines: string[], lineOneBased: number): [number, number] {
  let start = 0;
  for (let i = 0; i < lineOneBased - 1 && i < sourceLines.length; i++) {
    start += sourceLines[i]!.length + 1;
  }
  const lineIndex = lineOneBased - 1;
  const lineContent = sourceLines[lineIndex] ?? '';
  const lineEnd = start + lineContent.length;
  const hasNewline = lineIndex < sourceLines.length - 1;
  const end = hasNewline ? lineEnd + 1 : lineEnd;
  return [start, end];
}

const rule: Rule = {
  id: 'no-console-log',
  severity: 'warning',
  category: 'best-practice',
  frameworks: ['react', 'next', 'vite', 'remix'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];

    traverse(ast, (node) => {
      if (node.type !== 'CallExpression') return;
      const callee = node.callee;
      if (
        callee.type !== 'MemberExpression' ||
        callee.object.type !== 'Identifier' ||
        callee.object.name !== 'console' ||
        callee.property.type !== 'Identifier'
      )
        return;

      const method = callee.property.name;
      if (!['log', 'warn', 'error', 'info', 'debug'].includes(method)) return;
      if (insideDevGuard(node)) return;

      const line = node.loc!.start.line;
      const col = node.loc!.start.column;
      const [rangeStart, rangeEnd] = lineRange(sourceLines, line);
      const lineContent = sourceLines[line - 1] ?? '';

      out.push({
        ruleId: 'no-console-log',
        severity: 'warning',
        category: 'best-practice',
        message: `console.${method}() in source — remove or guard for production`,
        filePath,
        line,
        column: col,
        codeSnippet: getCodeSnippet(sourceLines, line),
        fix: `Remove the line or wrap in a dev check. Example:\nif (process.env.NODE_ENV === 'development') { console.${method}(...); }`,
        suggestions: ['Prefer a logger with levels or strip in build'],
        autofix: {
          range: [rangeStart, rangeEnd],
          text: `// ${lineContent.trim()}${line < sourceLines.length ? '\n' : ''}`,
        },
      });
    });

    return out;
  },
};

export default rule;
