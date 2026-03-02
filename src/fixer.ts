import * as fs from 'fs';
import type { Diagnostic } from './types';

export interface ApplyFixOptions {
  dryRun?: boolean;
}

/**
 * Group diagnostics that have autofix by file, then apply fixes from end to start
 * so offsets don't shift. Skip overlapping ranges (apply first non-overlapping).
 */
export function applyFixes(
  diagnostics: Diagnostic[],
  options: ApplyFixOptions = {}
): Map<string, string> {
  const withFix = diagnostics.filter((d): d is Diagnostic & { autofix: NonNullable<Diagnostic['autofix']> } =>
    d.autofix != null
  );
  if (withFix.length === 0) return new Map();

  const byFile = new Map<string, Array<{ range: [number, number]; text: string }>>();
  for (const d of withFix) {
    if (!byFile.has(d.filePath)) byFile.set(d.filePath, []);
    byFile.get(d.filePath)!.push({ range: d.autofix!.range, text: d.autofix!.text });
  }

  const result = new Map<string, string>();
  for (const [filePath, fixes] of byFile) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    // Sort by range start descending so we apply from end to start
    const sorted = [...fixes].sort((a, b) => b.range[0] - a.range[0]);

    // Drop overlapping: after sorting by start desc, we need no two ranges to overlap.
    // So when applying, after we apply one, we know nothing with start >= applied.start
    // should overlap. So we filter: keep only fixes whose [start,end] doesn't overlap
    // with any later-applied (smaller start) fix. Simpler: collect non-overlapping
    // from the end. Start with the last fix (smallest start in sorted order = last in array).
    // Then add a fix if its range doesn't overlap with any already chosen.
    const chosen: Array<{ range: [number, number]; text: string }> = [];
    for (const fix of sorted) {
      const [s, e] = fix.range;
      const overlaps = chosen.some(
        (c) => !(e <= c.range[0] || s >= c.range[1])
      );
      if (!overlaps) chosen.push(fix);
    }

    let output = content;
    for (const { range, text } of chosen) {
      output = output.slice(0, range[0]) + text + output.slice(range[1]);
    }
    result.set(filePath, output);
  }

  if (!options.dryRun) {
    for (const [filePath, newContent] of result) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
    }
  }

  return result;
}
