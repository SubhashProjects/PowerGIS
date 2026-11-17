// ============================================================================
// POWERGIS BUILD PREPARATION SCRIPT
// Restores index.template.html -> index.html for Vite compilation
// ============================================================================

import fs from 'fs';

if (fs.existsSync('index.template.html')) {
  fs.copyFileSync('index.template.html', 'index.html');
  console.log('✓ Restored index.html template for Vite compilation');
}
