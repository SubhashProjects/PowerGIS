// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// COMMONS: TYPOGRAPHY & FONT SYSTEM (SINGLE SOURCE OF TRUTH - SSOT)
// Change any font family, scale, or weight here to reflect across the ENTIRE website.
// ============================================================================

export type FontFamilyKey = 'sans' | 'mono' | 'serif';

export interface FontFamilyDefinition {
  name: string;
  family: string;
  description: string;
  letterSpacing: string;
}

export const FONTS = {
  // Master Font Families (SSOT)
  families: {
    // 1. Primary Swiss / Neo-Grotesque Sans-Serif (Default Anti-Slop High-Craft)
    sans: {
      name: 'Inter',
      family: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
      description: 'Swiss neo-grotesque clean sans-serif for ultra-legible, crisp interfaces',
      letterSpacing: '-0.011em',
    },
    // 2. High-Precision Technical Monospace (Telemetry, Readings, IOA, Code)
    mono: {
      name: 'JetBrains Mono',
      family: `'JetBrains Mono', 'SF Mono', Consolas, Menlo, monospace`,
      description: 'Technical monospace for telemetry readings, coordinates, and system logs',
      letterSpacing: '-0.02em',
    },
    // 3. Classic Statutory / Times New Roman Serif (Official Regulatory Gazettes)
    serif: {
      name: 'Times New Roman',
      family: `'Times New Roman', Times, 'Liberation Serif', Georgia, serif`,
      description: 'Official statutory serif font for legal gazettes and regulatory filings',
      letterSpacing: '0em',
    },
  } as Record<FontFamilyKey, FontFamilyDefinition>,

  // Active Primary Font Family Key - Set to 'sans' (Inter) or 'serif' (Times New Roman)
  activeFamilyKey: 'sans' as FontFamilyKey,

  // Typography Scales (Strict Hierarchy)
  sizes: {
    micro: 'text-[9px]',      // Badges, sub-micro captions
    nano: 'text-[10px]',      // Status tags, table subtext, pill badges
    xs: 'text-xs',            // Standard secondary data, body small (12px)
    sm: 'text-sm',            // Standard UI body text (14px)
    base: 'text-base',        // Standard headings / primary labels (16px)
    lg: 'text-lg',            // Section titles (18px)
    xl: 'text-xl',            // Module titles (20px)
    '2xl': 'text-2xl',        // Stat numbers / KPI hero digits (24px)
    '3xl': 'text-3xl',        // Prominent KPI displays (30px)
  },

  // Font Weights
  weights: {
    normal: 'font-normal',    // 400
    medium: 'font-medium',    // 500
    semibold: 'font-semibold',// 600
    bold: 'font-bold',        // 700
    extrabold: 'font-extrabold', // 800
  },

  // Letter Spacing Rules
  tracking: {
    tighter: 'tracking-tighter', // Headings (-0.03em)
    tight: 'tracking-tight',     // Primary titles (-0.02em)
    normal: 'tracking-normal',   // Body (0em)
    wide: 'tracking-wider',      // Uppercase badges (+0.05em)
    widest: 'tracking-widest',   // Monospace status badges (+0.1em)
  },

  // Line Heights
  leading: {
    none: 'leading-none',
    tight: 'leading-tight',
    snug: 'leading-snug',
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
  },
} as const;

/**
 * Runtime font applicator - Injects font family into CSS root variables.
 * Enables changing the font dynamically or programmatically across the entire website.
 */
export function applyGlobalFont(familyKey: FontFamilyKey): void {
  if (typeof document === 'undefined') return;
  const def = FONTS.families[familyKey] || FONTS.families.sans;
  document.documentElement.style.setProperty('--font-primary', def.family);
  document.documentElement.style.setProperty('--font-letter-spacing', def.letterSpacing);
  document.documentElement.setAttribute('data-font', familyKey);
}

export type FontsConfig = typeof FONTS;
