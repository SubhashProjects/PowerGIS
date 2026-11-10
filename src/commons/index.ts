// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// COMMONS MASTER ARCHITECTURE (SINGLE SOURCE OF TRUTH - SSOT)
// Change any label, text, statutory value, font, or theme token once here.
// Strictly reflects across the entire website.
// ============================================================================

export * from './fonts';
export * from './theme';
export * from './values';
export * from './texts';
export * from './labels';

import { FONTS } from './fonts';
import { THEME } from './theme';
import { VALUES } from './values';
import { TEXTS } from './texts';
import { LABELS } from './labels';

/**
 * Unified COMMONS Bundle - One single import giving access to all configuration pillars:
 * 1. labels: All button texts, headings, table columns, tabs, and action names
 * 2. texts: All narrative paragraphs, guidance descriptions, policy statements, and disclaimers
 * 3. values: All grid nominal standards, IEEE 1366 reliability targets, and system thresholds
 * 4. fonts: All typography scales, font families, letter-spacing, and line-heights
 * 5. theme: All surface colors, 1px structural borders, 6px max radii, and status badge styles
 */
export const COMMONS = {
  fonts: FONTS,
  theme: THEME,
  values: VALUES,
  texts: TEXTS,
  labels: LABELS,
} as const;

export type CommonsType = typeof COMMONS;
