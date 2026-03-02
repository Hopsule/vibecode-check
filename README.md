# vibechecker

**Your React code's health check-up. One command. Zero config. Actually fixes your code.**

[![npm version](https://img.shields.io/npm/v/@hopsule/vibechecker.svg)](https://www.npmjs.com/package/@hopsule/vibechecker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Lightweight React code health CLI with **autofix** — no ESLint dependency, framework auto-detection (Next.js, Vite, Remix, React), and a copy-paste fix for every issue. Run it once and get a score, a clear report, and fixes you can apply with `--fix` or paste into your AI assistant with `--ai`.

---

## Quick start

```bash
npx @hopsule/vibechecker .
```

That's it. Framework is detected from your `package.json`; no config required.

**401 from GitHub Packages?** This package is public. Remove the `//npm.pkg.github.com/:_authToken=...` line from your `.npmrc` (keep `@hopsule:registry=https://npm.pkg.github.com`). Public packages don't need a token; an invalid one causes 401.

```bash
# Apply safe fixes automatically
npx @hopsule/vibechecker . --fix

# Get a badge for your README
npx @hopsule/vibechecker . --badge
```

---

## Why vibechecker?

| | vibechecker | ESLint + plugins | Biome |
|--|-------------|------------------|--------|
| **React/Next aware** | Yes, built-in | Via many plugins | Limited |
| **Autofix out of the box** | Yes | Per-rule | Yes |
| **Zero config** | Yes | No (config required) | Yes |
| **Single binary / one tool** | Yes (Node) | No (config chain) | Yes |
| **Score + categories** | Yes (0–100, by category) | No | No |
| **AI-friendly output** | `--ai` one-paste block | No | No |
| **Bundle size** | Small, no ESLint | Large | Small |

vibechecker focuses on **20+ high-impact rules** (correctness, performance, accessibility, best practice) with a clear report and a fix suggestion — or autofix — for each. No plugin matrix, no shared config to maintain.

---

## What you see

```
  vibechecker v0.2.0
  next  ·  127 files  ·  0.8s

  ────────────────────────────────────────

  CORRECTNESS                          92/100
  ✗  missing-use-client (2)        [fixable]
  ✗  fetch-in-effect (1)

  PERFORMANCE                          78/100
  ⚠  heavy-import (3)
  ⚠  large-component (1)

  ACCESSIBILITY                        85/100
  ⚠  a11y-label (2)
  ⚠  a11y-interactive (1)

  BEST PRACTICE                        90/100
  ⚠  no-console-log (4)           [fixable]

  ────────────────────────────────────────

  OVERALL SCORE

     ███████████████████████░░  82 / 100
                                    Solid

  2 fixable with --fix  ·  6 errors  ·  11 warnings

  ────────────────────────────────────────
```

---

## Install

```bash
npx @hopsule/vibechecker .
```

Or install globally:

```bash
npm install -g @hopsule/vibechecker
vibechecker .
```

---

## Usage

```bash
vibechecker [path] [options]
```

| Option | Description |
|--------|-------------|
| `--next` | Use Next.js rule profile |
| `--react` | Use React profile |
| `--vite` | Use Vite profile |
| `--remix` | Use Remix profile |
| `--fix` | Apply autofixes (prompts if uncommitted changes) |
| `--fix-dry-run` | Show files that would be fixed |
| `-v, --verbose` | Show file:line and snippet per issue |
| `--format json` | Machine-readable JSON output |
| `--ai` | Single block for pasting into an AI assistant |
| `--badge` | Output shields.io badge markdown for README |
| `--ci-comment` | Output markdown for GitHub PR comment |
| `--strict` | Exit 1 on warnings too |
| `-r, --rule <id>` | Run only one rule |
| `--list-rules` | List rules for selected framework |

---

## Rules

### Correctness
| Rule | Severity | Autofix | Description |
|------|----------|---------|-------------|
| missing-use-client | error | yes | Next.js: hook without `"use client"` |
| fetch-in-effect | error | — | fetch() inside useEffect |
| no-state-in-ref | warning | — | useRef with value that may need re-render |

### Performance
| Rule | Severity | Autofix | Description |
|------|----------|---------|-------------|
| effect-set-state | warning | — | Multiple setState in one useEffect |
| unnecessary-use-effect | warning | — | Effect only syncs one value or event flag |
| merge-state-into-reducer | warning | — | 4+ useState in one component |
| effect-as-handler | warning | — | useEffect as event handler |
| large-component | warning | — | Component too long / too many hooks or JSX |
| index-as-key | warning | yes* | Array index as key (*when item.id exists) |
| heavy-import | warning | — | Heavy lib without lazy load |
| no-array-spread-in-jsx | warning | — | Spread in .map() — pass explicit props |

### Next.js
| Rule | Severity | Autofix | Description |
|------|----------|---------|-------------|
| use-search-params | warning | — | useSearchParams without Suspense |
| img-not-optimized | warning | — | `<img>` instead of next/image |

### Accessibility
| Rule | Severity | Autofix | Description |
|------|----------|---------|-------------|
| a11y-autofocus | warning | — | autoFocus a11y |
| a11y-label | warning | — | Form control without label |
| a11y-interactive | warning | — | Click without keyboard handler |
| a11y-role | warning | — | Interactive element without role |

### Best practice
| Rule | Severity | Autofix | Description |
|------|----------|---------|-------------|
| no-console-log | warning | yes | console.log in source |
| no-inline-styles | warning | — | style={{}} — use CSS module or Tailwind |
| no-nested-ternary-jsx | warning | — | Nested ternary in JSX |
| prefer-named-export | warning | — | Prefer named over default export |
| no-anonymous-default-export | warning | — | Name component for DevTools |
| prefer-early-return | warning | — | if/else both return — use early return |
| no-prop-drilling | warning | — | 4+ props — consider Context or state lib |

---

## Config

Optional `vibechecker.config.json` or `.vibechecker.json` in project root:

```json
{
  "extends": "strict",
  "thresholds": { "error": 50, "warn": 70 },
  "ignore": {
    "rules": ["no-console-log"],
    "files": ["src/generated/**"]
  },
  "rules": {
    "large-component": "off",
    "fetch-in-effect": "error"
  },
  "categoryWeights": {
    "accessibility": 1.5
  },
  "strict": false,
  "showEmoji": false
}
```

- **extends** — `"strict"` or `"relaxed"` preset.
- **thresholds** — `error`: exit 1 if score below; `warn`: exit 1 if below when strict.
- **rules** — Per-rule `"error"` | `"warning"` | `"off"`.
- **categoryWeights** — Override category weights for scoring.

---

## Badge

Add a score badge to your README:

```bash
npx @hopsule/vibechecker . --badge
```

Paste the output into your README. The badge color reflects the score (green / yellow / orange / red).

---

## CI and PR comment

Run vibechecker in CI and optionally post the score as a PR comment:

```yaml
# .github/workflows/vibecheck.yml
- run: npx @hopsule/vibechecker . --ci-comment > vibechecker-comment.md
  continue-on-error: true
# Then use actions/github-script or a comment action to post the markdown to the PR.
```

This repo includes an example workflow [.github/workflows/vibecheck-pr-comment.yml](.github/workflows/vibecheck-pr-comment.yml) that runs on pull requests and posts the `--ci-comment` output as a bot comment (create or update). You can copy that job into your own repo and switch to `npx @hopsule/vibechecker . --ci-comment` if you don't build from source.

---

## Programmatic API

```ts
import { scan, computeScore, applyFixes } from '@hopsule/vibechecker';

const { diagnostics, totalFiles } = await scan({
  targetPath: './src',
  framework: 'next',
  configIgnoreFiles: [],
  configIgnoredRules: new Set(),
});

const score = computeScore(diagnostics, totalFiles, {
  categoryWeights: { accessibility: 1.5 },
});
const modified = applyFixes(diagnostics, { dryRun: true });
```

---

## Contributing

We welcome contributions. One rule = one file + a test when possible. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add a new rule and run tests.

---

## License

MIT
