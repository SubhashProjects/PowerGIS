# PowerGIS V3.2.4 UI Patch Notes

## Responsive table stability
- Standardized dense data tables with fixed layout behavior.
- Prevented table width and column positions from changing when switching tabs.
- Added stable operational table viewport heights to reduce page jumping.
- Added horizontal scrolling for dense tables on small screens.
- Added sticky first columns for mobile table navigation.

## Mobile usability
- Simplified the mobile header by moving secondary desktop controls out of the narrow header.
- Preserved access to full controls through the mobile navigation drawer.
- Improved touch target sizes for inputs and buttons.
- Added responsive spacing adjustments for narrow screens.

## General UI polish
- Stabilized tab strips for touch scrolling.
- Improved focus states and overflow handling.
- Preserved existing operational functionality and security behavior.

## Verification
- TypeScript/TSX transpilation: PASS.
- Existing production hardening static tests: PASS.
- Specialized module security tests: PASS.
- No npm installation performed.
