# PowerGIS GIS Data Guide — V3.2

## Spatial model
PowerGIS uses PostGIS and SRID 4326 for current asset geometry. Existing GIS layers include substations, feeders, transformers, poles, conductors and consumers.

## Import discipline
Imports must be treated as untrusted input: validate file type, coordinates, duplicate identifiers, relationships and jurisdiction before publication.

## Location provenance
Contractor surveys explicitly distinguish `GPS` from `MANUAL`. Manual coordinates are never displayed as GPS-verified.

## Large datasets
Use server-side filtering/pagination and viewport-based spatial queries before loading large operational datasets into the browser.
