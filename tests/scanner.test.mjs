import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan, computeScore } from '../dist/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures');

function minimalDiagnostic(overrides = {}) {
  return {
    severity: 'warning',
    filePath: 'a',
    line: 1,
    column: 0,
    category: 'best-practice',
    ruleId: 'x',
    message: '',
    codeSnippet: [],
    fix: '',
    ...overrides,
  };
}

describe('scanner', () => {
  it('scans a directory and returns diagnostics', async () => {
    const result = await scan({
      targetPath: path.join(FIXTURES, 'with-issues'),
      framework: 'react',
      configIgnoreFiles: [],
      configIgnoredRules: new Set(),
    });
    assert.ok(Array.isArray(result.diagnostics));
    assert.ok(typeof result.totalFiles === 'number');
    assert.ok(result.totalFiles >= 0);
    const ruleIds = [...new Set(result.diagnostics.map((d) => d.ruleId))];
    assert.ok(ruleIds.includes('no-console-log'), 'with-issues should trigger no-console-log');
    assert.ok(ruleIds.includes('a11y-interactive'), 'with-issues should trigger a11y-interactive');
  });

  it('returns empty or clean scan for dir', async () => {
    const result = await scan({
      targetPath: path.join(FIXTURES, 'empty-or-clean'),
      framework: 'react',
      configIgnoreFiles: [],
      configIgnoredRules: new Set(),
    });
    assert.ok(Array.isArray(result.diagnostics));
  });
});

describe('scorer', () => {
  it('computes score 100 for no diagnostics', () => {
    const r = computeScore([], 10);
    assert.strictEqual(r.score, 100);
    assert.strictEqual(r.errors, 0);
    assert.strictEqual(r.warnings, 0);
    assert.ok(r.scoreByCategory);
    assert.strictEqual(r.scoreByCategory['best-practice'], 100);
  });

  it('applies penalty for errors and warnings', () => {
    const diag = [
      minimalDiagnostic({ severity: 'error', category: 'correctness' }),
      minimalDiagnostic({ severity: 'warning', category: 'best-practice' }),
    ];
    const r = computeScore(diag, 5);
    assert.strictEqual(r.errors, 1);
    assert.strictEqual(r.warnings, 1);
    assert.ok(r.score < 100);
    assert.ok(r.scoreByCategory.correctness < 100);
    assert.ok(r.scoreByCategory['best-practice'] < 100);
  });

  it('handles zero totalFiles without throwing', () => {
    const r = computeScore([], 0);
    assert.strictEqual(r.score, 100);
    assert.strictEqual(r.totalFiles, 0);
  });

  it('accepts categoryWeights option', () => {
    const diag = [
      minimalDiagnostic({ category: 'accessibility' }),
      minimalDiagnostic({ category: 'accessibility' }),
    ];
    const rDefault = computeScore(diag, 10);
    const rCustom = computeScore(diag, 10, {
      categoryWeights: { accessibility: 0.5 },
    });
    assert.ok(rCustom.score >= rDefault.score, 'lower weight should yield higher score');
  });
});

describe('reporter formats', () => {
  it('score result has label and scoreByCategory', () => {
    const r = computeScore([], 5);
    assert.strictEqual(r.label, 'Pristine');
    assert.ok(r.labelDescription);
    assert.strictEqual(typeof r.scoreByCategory.correctness, 'number');
    assert.strictEqual(typeof r.scoreByCategory.performance, 'number');
    assert.strictEqual(typeof r.scoreByCategory.accessibility, 'number');
    assert.strictEqual(typeof r.scoreByCategory['best-practice'], 'number');
  });
});
