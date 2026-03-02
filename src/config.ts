import * as fs from 'fs';
import * as path from 'path';
import type { Config } from './types';

const CONFIG_NAMES = ['vibechecker.config.json', '.vibechecker.json'];

const PRESETS: Record<string, Partial<Config>> = {
  strict: {
    strict: true,
    thresholds: { error: 50, warn: 70 },
  },
  relaxed: {
    strict: false,
    thresholds: { error: 0, warn: 0 },
    ignore: { rules: ['no-console-log', 'prefer-named-export', 'no-inline-styles'] },
  },
};

function mergeConfig(base: Partial<Config>, override: Partial<Config> | null): Config | null {
  if (!override) return base as Config;
  return {
    ...base,
    ...override,
    ignore: override.ignore ?? base.ignore,
    thresholds: override.thresholds ?? base.thresholds,
    rules: override.rules ?? base.rules,
    categoryWeights: override.categoryWeights ?? base.categoryWeights,
  } as Config;
}

export function loadConfig(cwd: string): Config | null {
  const dir = path.resolve(cwd);
  let config: Config | null = null;

  for (const name of CONFIG_NAMES) {
    const filePath = path.join(dir, name);
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        config = JSON.parse(raw) as Config;
        break;
      }
    } catch {
      // invalid json or read error — skip
    }
  }

  if (config?.extends && PRESETS[config.extends]) {
    config = mergeConfig(PRESETS[config.extends], config);
  }
  return config;
}

export function resolveIgnorePatterns(config: Config | null): string[] {
  const files = config?.ignore?.files;
  if (!files || !Array.isArray(files)) return [];
  return files;
}

/**
 * Returns rule IDs that should be skipped (from ignore.rules + rules with 'off').
 */
export function resolveIgnoredRules(config: Config | null): Set<string> {
  const fromIgnore = config?.ignore?.rules ?? [];
  const fromRules =
    config?.rules &&
    Object.entries(config.rules)
      .filter(([, v]) => v === 'off')
      .map(([k]) => k);
  const legacy = config?.severityOverrides
    ? Object.entries(config.severityOverrides)
        .filter(([, v]) => v === 'off')
        .map(([k]) => k)
    : [];
  return new Set([...fromIgnore, ...(fromRules ?? []), ...legacy]);
}

/**
 * Returns severity overrides: ruleId -> 'error' | 'warning'. Rules with 'off' are in ignored set.
 */
export function resolveSeverityOverrides(config: Config | null): Map<string, 'error' | 'warning'> {
  const map = new Map<string, 'error' | 'warning'>();
  const rules = config?.rules ?? config?.severityOverrides;
  if (!rules) return map;
  for (const [id, sev] of Object.entries(rules)) {
    if (sev === 'error' || sev === 'warning') map.set(id, sev);
  }
  return map;
}
