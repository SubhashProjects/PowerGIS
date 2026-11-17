# PowerGIS UI Style Guide

## Scope

All application UI outside GIS Master Map is strictly neutral/grayscale. The GIS Master Map retains its operational map colors and symbology.

## Source of truth

- `colors.ts`: neutral color tokens
- `fonts.ts`: font family and allowed weights
- `ui.ts`: radius, spacing, focus, shadow and table tokens
- `index.css`: shared application CSS
- `StylesPage.tsx`: visual reference page

## Rules

1. Do not use `filter: grayscale()` to achieve the design.
2. Do not add colored Tailwind utilities to non-GIS components.
3. Do not add colored hex/RGB values to non-GIS components.
4. Do not use application-wide color overrides that target GIS SVG/canvas/map elements.
5. Keep GIS colors local to GIS components/configuration.
6. Use normal or bold text; underline only when semantically required.
7. Keep reusable presentation tokens in `src/styles/`.
8. Keep business/domain shared content in `src/commons/`.
