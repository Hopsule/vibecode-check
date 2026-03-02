/**
 * Extract a few lines around the given line number for display in diagnostics.
 * Current line is marked with ">" in the margin.
 */
export function getCodeSnippet(
  sourceLines: string[],
  line: number,
  contextLines = 2
): string[] {
  const oneBased = line;
  const start = Math.max(0, oneBased - 1 - contextLines);
  const end = Math.min(sourceLines.length, oneBased - 1 + contextLines + 1);
  const out: string[] = [];

  for (let i = start; i < end; i++) {
    const num = i + 1;
    const marker = num === oneBased ? '>' : ' ';
    const content = sourceLines[i] ?? '';
    out.push(`${marker} ${String(num).padStart(3)} | ${content}`);
  }

  return out;
}
