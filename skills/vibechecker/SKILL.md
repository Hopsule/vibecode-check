# vibechecker skill

Use this when the user wants to check or improve React code health in their project.

## When to use

- User asks to "check my React code", "run a lint/health check", "find React issues", or "vibecheck my project".
- User wants to fix common React/Next.js issues (use client, console.log, useEffect patterns, a11y, etc.).

## How to use

1. **Scan the project:** Run `npx vibechecker .` (or `npx vibechecker <path>`). If the project is Next.js, use `--next` for the full rule set.

2. **Interpret output:** vibechecker prints:
   - Rule id, count, and short message per issue group
   - Score (0–100) and label (Excellent / Great / Needs work / Critical)
   - `[fixable]` means the issue can be fixed with `--fix`

3. **Apply fixes when safe:** If the user agrees, run `npx vibechecker . --fix` to apply autofixes (e.g. add `"use client"`, comment out `console.log`). The CLI will prompt if there are uncommitted changes.

4. **Other flags:**
   - `--verbose`: show file:line and code snippet per issue
   - `--format json`: machine-readable output
   - `--ai`: single block suitable for pasting into a chat
   - `--strict`: exit 1 on warnings too (useful in CI)

## Rule categories

- **Correctness:** missing-use-client, fetch-in-effect
- **State/effects:** effect-set-state, unnecessary-use-effect, merge-state-into-reducer, effect-as-handler
- **Performance:** large-component, index-as-key, heavy-import
- **Next.js:** use-search-params, img-not-optimized
- **Accessibility:** a11y-autofocus, a11y-label, a11y-interactive, a11y-role
- **Best practice:** no-console-log

Suggest fixes from the CLI output (each diagnostic includes a `fix` string and optional `suggestions`).
