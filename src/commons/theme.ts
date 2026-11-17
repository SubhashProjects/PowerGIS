/** Backward-compatible re-export. Presentation tokens live in src/styles. */
export { COLORS, UI } from '../styles';
export type { Colors, UIConfig } from '../styles';

import { COLORS } from '../styles/colors';

export const THEME = {
  surfaces: {
    canvas: COLORS.canvas,
    card: COLORS.surface,
    subtle: COLORS.surfaceSubtle,
    elevated: COLORS.surface,
    contrast: COLORS.control,
    borderHairline: COLORS.border,
    divider: COLORS.divider,
  },
  text: {
    primary: COLORS.text,
    secondary: COLORS.textSecondary,
    muted: COLORS.textMuted,
    inverse: COLORS.textInverse,
    accent: COLORS.control,
  },
  geometry: {
    maxBorderRadius: '0.375rem',
    borderRadiusClass: 'rounded-md',
    borderHairlineClass: 'border border-neutral-200',
    shadowHairlineClass: 'shadow-xs',
  },
  states: Object.fromEntries(['optimal','active','warning','critical','standby','closed','open'].map(label => [label, {
    bg: 'bg-neutral-50', text: 'text-neutral-800', border: 'border-neutral-300', dot: 'bg-neutral-500', label: label === 'critical' ? 'Critical / Tripped' : label,
  }])),
  roleBadges: Object.fromEntries(['super_admin','state_admin','se','ee','aee','ae','je','contractor','auditor','gis_admin'].map(role => [role, {
    bg: 'bg-neutral-100 text-neutral-900 border-neutral-300', dot: 'bg-neutral-700', label: role,
  }])),
  getPriorityStyle: (_priority: string) => 'bg-neutral-50 text-neutral-800 border-neutral-300 font-normal',
  getStatusStyle: (_status: string) => 'bg-neutral-50 text-neutral-800 border-neutral-300 font-normal',
} as const;

export type ThemeConfig = typeof THEME;
