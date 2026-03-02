import type { TSESTree } from '@typescript-eslint/typescript-estree';

const IGNORED_KEYS = new Set([
  'parent',
  'loc',
  'range',
  'tokens',
  'comments',
]);

export type TraverseVisitor = (node: TSESTree.Node) => void;

/**
 * Walk the AST and call visitor for every node (depth-first).
 */
export function traverse(
  node: TSESTree.Node,
  visitor: TraverseVisitor
): void {
  visitor(node);

  const record = node as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (IGNORED_KEYS.has(key)) continue;

    const value = record[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object' && 'type' in item) {
          traverse(item as TSESTree.Node, visitor);
        }
      }
    } else if (
      value &&
      typeof value === 'object' &&
      'type' in value
    ) {
      traverse(value as TSESTree.Node, visitor);
    }
  }
}
