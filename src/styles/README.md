# PowerGIS Styles

This directory is the single source of truth for presentation-only concerns:

- `colors.ts` — neutral application colors. GIS operational colors stay inside GIS components/configuration.
- `fonts.ts` — typography family, weights and spacing.
- `ui.ts` — shared radius, spacing, focus, shadow and table tokens.
- `index.ts` — public style-system exports.

Business/common content remains under `src/commons/` (labels, texts, values and validators).
Do not add application-wide color/font/UI tokens to individual components.
