import { COLORS } from './colors';
import { FONTS } from './fonts';

/** Shared UI/design-system tokens. */
export const UI = {
  colors: COLORS,
  fonts: FONTS,
  radius: {
    sm: '0.25rem',
    md: '0.375rem',
  },
  spacing: {
    page: '1rem',
    section: '1.25rem',
  },
  focusRing: `0 0 0 3px ${COLORS.surfaceMuted}`,
  shadow: `0 1px 3px 0 ${COLORS.shadow}`,
  table: {
    headerHeight: '2.5rem',
    rowHeight: '2.75rem',
  },
} as const;

export type UIConfig = typeof UI;
