// ============================================================================
// POWERGIS COMMONS
// Business/domain-wide shared content and validation only.
// Presentation concerns (colors, fonts, spacing, UI tokens) live in src/styles.
// ============================================================================

export * from './values';
export * from './texts';
export * from './labels';
export * from './validators';

import { VALUES } from './values';
import { TEXTS } from './texts';
import { LABELS } from './labels';
import * as VALIDATORS from './validators';

/**
 * Business COMMONS bundle. Presentation tokens are intentionally excluded;
 * import them from src/styles instead.
 */
export const COMMONS = {
  values: VALUES,
  texts: TEXTS,
  labels: LABELS,
  validators: VALIDATORS,
} as const;

export type CommonsType = typeof COMMONS;
