/** Backward-compatible style configuration facade. New presentation tokens live in src/styles. */
export * from '../styles';

import { COLORS } from '../styles/colors';
import { THEME } from '../commons/theme';

export const THEME_CONFIG = {
  gradients: {
    primary: 'from-neutral-700 to-neutral-700',
    primaryHover: 'from-neutral-800 to-neutral-800',
    emblem: 'from-neutral-700 via-neutral-700 to-neutral-600',
    accent: 'from-neutral-600 to-neutral-700',
    success: 'from-neutral-600 to-neutral-700',
    warning: 'from-neutral-600 to-neutral-600',
    danger: 'from-neutral-600 to-neutral-700',
    purple: 'from-neutral-700 to-neutral-700',
  },
  colors: {
    electricBlue: COLORS.control,
    navyBlue: COLORS.control,
    cyan: COLORS.textSecondary,
    emerald: COLORS.textSecondary,
    amber: COLORS.textMuted,
    rose: COLORS.textSecondary,
    violet: COLORS.textSecondary,
    slateDark: COLORS.text,
    slateMuted: COLORS.textMuted,
    slateBorder: COLORS.border,
    canvasBg: COLORS.canvas,
    cardBg: COLORS.surface,
  },
  roleBadges: THEME.roleBadges,
  getPriorityStyle: THEME.getPriorityStyle,
  getStatusStyle: THEME.getStatusStyle,
} as const;
