// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// THEME & DESIGN TOKENS CONFIGURATION (SSOT)
// Re-exports from src/commons/theme for unified modular architecture.
// Change any surface color, border, or badge token in src/commons/theme.ts.
// ============================================================================

export * from '../commons/theme';
export * from '../commons/fonts';

import { THEME } from '../commons/theme';

// Backward compatibility export for legacy references to THEME_CONFIG
export const THEME_CONFIG = {
  gradients: {
    primary: 'from-blue-600 to-indigo-600',
    primaryHover: 'from-blue-700 to-indigo-700',
    emblem: 'from-blue-600 via-indigo-600 to-cyan-500',
    accent: 'from-cyan-500 to-blue-600',
    success: 'from-emerald-500 to-teal-600',
    warning: 'from-amber-500 to-orange-500',
    danger: 'from-rose-500 to-red-600',
    purple: 'from-purple-600 to-indigo-600',
  },
  colors: {
    electricBlue: '#2563EB',
    navyBlue: '#1E3A8A',
    cyan: '#06B6D4',
    emerald: '#10B981',
    amber: '#F59E0B',
    rose: '#EF4444',
    violet: '#8B5CF6',
    slateDark: '#09090B',
    slateMuted: '#71717A',
    slateBorder: '#E4E4E7',
    canvasBg: '#FAFAFA',
    cardBg: '#FFFFFF',
  },
  roleBadges: THEME.roleBadges,
  getPriorityStyle: THEME.getPriorityStyle,
  getStatusStyle: THEME.getStatusStyle,
} as const;
