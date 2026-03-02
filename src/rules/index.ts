import type { Rule } from '../types';
import missingUseClient from './missing-use-client';
import noConsoleLog from './no-console-log';
import fetchInEffect from './fetch-in-effect';
import effectSetState from './effect-set-state';
import unnecessaryUseEffect from './unnecessary-use-effect';
import mergeStateIntoReducer from './merge-state-into-reducer';
import effectAsHandler from './effect-as-handler';
import largeComponent from './large-component';
import indexAsKey from './index-as-key';
import heavyImport from './heavy-import';
import useSearchParams from './use-search-params';
import imgNotOptimized from './img-not-optimized';
import a11yAutofocus from './a11y-autofocus';
import a11yLabel from './a11y-label';
import a11yInteractive from './a11y-interactive';
import a11yRole from './a11y-role';
import noInlineStyles from './no-inline-styles';
import noNestedTernaryJsx from './no-nested-ternary-jsx';
import preferNamedExport from './prefer-named-export';
import noArraySpreadInJsx from './no-array-spread-in-jsx';
import noAnonymousDefaultExport from './no-anonymous-default-export';
import noStateInRef from './no-state-in-ref';
import preferEarlyReturn from './prefer-early-return';
import noPropDrilling from './no-prop-drilling';

export const allRules: Rule[] = [
  missingUseClient,
  noConsoleLog,
  fetchInEffect,
  effectSetState,
  unnecessaryUseEffect,
  mergeStateIntoReducer,
  effectAsHandler,
  largeComponent,
  indexAsKey,
  heavyImport,
  useSearchParams,
  imgNotOptimized,
  a11yAutofocus,
  a11yLabel,
  a11yInteractive,
  a11yRole,
  noInlineStyles,
  noNestedTernaryJsx,
  preferNamedExport,
  noArraySpreadInJsx,
  noAnonymousDefaultExport,
  noStateInRef,
  preferEarlyReturn,
  noPropDrilling,
];

export const ruleMap = new Map<string, Rule>(
  allRules.map((r) => [r.id, r])
);
