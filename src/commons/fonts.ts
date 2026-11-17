// PowerGIS typography policy: plain text only.
// Allowed visual text emphasis: normal, bold, underline.
// Font size remains controlled by layout components for readability.
export type FontFamilyKey = 'sans' | 'mono' | 'serif';

export interface FontFamilyDefinition {
 family: string;
 letterSpacing: string;
 description: string;
}

const PLAIN_FONT = 'Arial, Helvetica, sans-serif';

export const FONTS = {
 families: {
 sans: {
 family: PLAIN_FONT,
 letterSpacing: 'normal',
 description: 'Plain sans-serif text',
 },
 mono: {
 family: PLAIN_FONT,
 letterSpacing: 'normal',
 description: 'Plain text compatibility alias',
 },
 serif: {
 family: PLAIN_FONT,
 letterSpacing: 'normal',
 description: 'Plain text compatibility alias',
 },
 } as Record<FontFamilyKey, FontFamilyDefinition>,

 activeFamilyKey: 'sans' as FontFamilyKey,

 weights: {
 normal: 'font-normal', // 400
 bold: 'font-bold', // 700
 },

 lineHeights: {
 normal: 'leading-normal',
 },
} as const;

export type FontsConfig = typeof FONTS;

/**
 * Compatibility function retained for callers, but every family resolves
 * to the same plain font. It cannot activate serif or monospace typography.
 */
export function applyGlobalFont(_familyKey: FontFamilyKey): void {
 document.documentElement.style.setProperty('--font-primary', PLAIN_FONT);
 document.documentElement.style.setProperty('--font-letter-spacing', 'normal');
 document.documentElement.setAttribute('data-font', 'sans');
}
