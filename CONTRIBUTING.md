# Contributing to vibechecker

## Adding a new rule

One rule = one file + one test (when possible).

1. **Create a rule file** in `src/rules/`, e.g. `src/rules/my-rule.ts`.

2. **Implement the `Rule` interface:**

```ts
import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { traverse } from '../traverse';
import { getCodeSnippet } from '../utils/snippet';
import type { Diagnostic, Rule } from '../types';

const rule: Rule = {
  id: 'my-rule',
  severity: 'warning',
  category: 'best-practice',
  frameworks: ['react', 'next'],

  check(ast, filePath, sourceLines): Diagnostic[] {
    const out: Diagnostic[] = [];
    // Use traverse(ast, (node) => { ... }) to find patterns
    // Push to out with: ruleId, severity, category, message, filePath, line, column, codeSnippet, fix, optional suggestions, optional autofix
    return out;
  },
};

export default rule;
```

3. **Register the rule** in `src/rules/index.ts`: add the import and append to `allRules`.

4. **Optional autofix:** If the fix is safe and deterministic, add to the diagnostic:

```ts
autofix: { range: [startOffset, endOffset], text: 'replacement' }
```

Offsets are character positions in the file. Apply fixes from end to start to avoid offset shifts.

5. **Test:** Add a fixture in `tests/fixtures/` and extend `tests/scanner.test.mjs` (or add a dedicated test file) to assert the rule fires when expected.

## Config and ignore

- Rules can be disabled per project via `vibechecker.config.json`: `ignore.rules: ["rule-id"]`.
- Files can be ignored via `ignore.files: ["glob/**"]`.

## Code style

- TypeScript strict mode.
- Prefer minimal dependencies; use the existing `traverse` and `getCodeSnippet` helpers.
