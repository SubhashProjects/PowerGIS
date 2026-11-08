// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// PRODUCTION BUNDLE & GITHUB PAGES MULTI-DEPLOYMENT SYNCHRONIZER
// Automatically mirrors dist/ -> docs/, portal/, assets/, 404.html & login.html
// ============================================================================

import fs from 'fs';
import path from 'path';

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((child) => {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    });
  } else {
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

// 1. Mirror dist to docs & portal
copyRecursiveSync('dist', 'docs');
copyRecursiveSync('dist', 'portal');
copyRecursiveSync('dist/assets', 'assets');

// 2. Generate 404.html and login.html entrypoints across all deployment roots
const distHtml = fs.readFileSync('dist/index.html', 'utf8');

['dist', 'docs', 'portal'].forEach(dir => {
  fs.writeFileSync(path.join(dir, '404.html'), distHtml, 'utf8');
  fs.writeFileSync(path.join(dir, 'login.html'), distHtml, 'utf8');
});

// Root fallback 404 and login
fs.writeFileSync('404.html', distHtml, 'utf8');
fs.writeFileSync('login.html', distHtml, 'utf8');

console.log('✓ Successfully synchronized production bundles to dist, docs, portal, assets, 404.html and login.html');
