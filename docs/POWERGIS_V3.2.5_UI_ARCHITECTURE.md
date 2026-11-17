# PowerGIS V3.2.5 UI Architecture

## UI color policy

All application UI outside the GIS Master Map is strictly neutral/grayscale. The implementation does not use a grayscale filter. GIS operational colors remain local to the GIS components and GIS configuration.

## Presentation source of truth

`src/styles/` owns:

- colors
- fonts
- UI tokens
- global presentation CSS
- style guide

`src/commons/` owns business/domain shared content:

- labels
- texts
- values
- validators

## Compatibility

Legacy imports from `src/commons/theme.ts`, `src/commons/fonts.ts`, and `src/config/themeConfig.ts` remain available as compatibility facades, but the actual presentation tokens live under `src/styles/`.

## Developer rule

Do not add application-wide colors, fonts, spacing, radii, shadows, or UI tokens directly inside operational components. GIS map symbology is the only intentional exception.
