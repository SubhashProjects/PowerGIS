# PowerGIS Commons

`src/commons/` contains shared business/domain content only:

- `labels.ts` — navigation, headings, actions and table labels.
- `texts.ts` — narrative/help/policy text.
- `values.ts` — domain standards and thresholds.
- `validators.ts` — shared validation rules.

Presentation concerns are deliberately separated into `src/styles/`.
Do not put colors, fonts, spacing, shadows, radii or component styling tokens here.
