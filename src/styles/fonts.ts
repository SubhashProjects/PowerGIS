/** PowerGIS typography tokens. Only normal and bold emphasis are used. */
export const FONTS = {
  family: 'Arial, Helvetica, sans-serif',
  weights: {
    normal: 400,
    bold: 700,
  },
  letterSpacing: 'normal',
  lineHeight: 1.4,
} as const;

export type Fonts = typeof FONTS;

/** Backward-compatible API for existing callers. */
export function applyGlobalFont(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--font-primary', FONTS.family);
  document.documentElement.style.setProperty('--font-letter-spacing', FONTS.letterSpacing);
  document.documentElement.setAttribute('data-font', 'sans');
}
