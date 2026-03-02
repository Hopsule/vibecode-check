import { parse } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';
import * as fs from 'fs';

export interface ParseSuccess {
  ast: TSESTree.Program;
  sourceLines: string[];
}

export interface ParseFailure {
  parseError: {
    filePath: string;
    message: string;
    line: number;
  };
}

export type ParseResult = ParseSuccess | ParseFailure | null;

export function isParseFailure(
  result: ParseResult
): result is ParseFailure {
  return result !== null && 'parseError' in result;
}

export function parseFile(filePath: string): ParseResult {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const sourceLines = raw.split(/\r?\n/);

    const ast = parse(raw, {
      jsx: true,
      loc: true,
      range: true,
      comment: false,
      tokens: false,
    });

    attachParents(ast);
    return { ast, sourceLines };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const lineMatch = message.match(/\((\d+),/);
    const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;
    return {
      parseError: { filePath, message, line },
    };
  }
}

function attachParents(program: TSESTree.Program): void {
  function visit(node: TSESTree.Node, parent: TSESTree.Node | null): void {
    if (parent) {
      (node as TSESTree.Node & { parent?: TSESTree.Node }).parent = parent;
    }
    for (const key of Object.keys(node)) {
      if (['parent', 'loc', 'range', 'tokens', 'comments'].includes(key))
        continue;
      const value = (node as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) {
            visit(item as TSESTree.Node, node);
          }
        }
      } else if (
        value &&
        typeof value === 'object' &&
        'type' in value
      ) {
        visit(value as TSESTree.Node, node);
      }
    }
  }
  visit(program, null);
}
