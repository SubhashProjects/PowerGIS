/**
 * PowerGIS UI color tokens.
 *
 * Non-GIS application UI uses neutral tones only. GIS Master Map owns its
 * operational colors locally inside the GIS components and map configuration.
 */
export const COLORS = {
  canvas: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceSubtle: '#F4F4F4',
  surfaceMuted: '#E4E4E4',
  text: '#090909',
  textSecondary: '#535353',
  textMuted: '#727272',
  textDisabled: '#A2A2A2',
  textInverse: '#FFFFFF',
  border: '#E4E4E4',
  borderStrong: '#A2A2A2',
  divider: '#F4F4F4',
  control: '#272727',
  controlHover: '#181818',
  focus: '#535353',
  shadow: 'rgba(0, 0, 0, 0.06)',
} as const;

export type Colors = typeof COLORS;
