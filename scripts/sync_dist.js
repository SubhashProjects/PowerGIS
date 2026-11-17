// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// MULTI-TARGET STATIC DEPLOYMENT SYNCHRONIZER
// Mirrors compiled bundles to root index.html, docs/, portal/, assets/, 404, login
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

let distHtml = fs.readFileSync('dist/index.html', 'utf8');

// Ensure trailing slash helper is injected in <head> for GitHub Pages relative asset resolution
if (!distHtml.includes('location.replace(location.pathname')) {
  const redirectScript = `
    <script>
      // Ensure trailing slash on repo paths so relative assets resolve correctly
      if (!location.pathname.endsWith('/') && !location.pathname.split('/').pop().includes('.')) {
        location.replace(location.pathname + '/' + location.search + location.hash);
      }
    </script>
  </head>`;
  distHtml = distHtml.replace('</head>', redirectScript);
  fs.writeFileSync('dist/index.html', distHtml, 'utf8');
}

function cleanOldAssets(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((file) => {
    if (file.startsWith('index-') && (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.map'))) {
      try {
        fs.unlinkSync(path.join(dir, file));
      } catch {}
    }
  });
}

// 1. Clean legacy compiled assets from destination directories
cleanOldAssets('docs/assets');
cleanOldAssets('portal/assets');
cleanOldAssets('assets');

// 2. Mirror dist to docs, portal & root assets
copyRecursiveSync('dist', 'docs');
copyRecursiveSync('dist', 'portal');
copyRecursiveSync('dist/assets', 'assets');

// 2. Overwrite root index.html with the compiled production bundle!
// This fixes GitHub Pages when configured to deploy from 'master' branch / (root)
fs.writeFileSync('index.html', distHtml, 'utf8');

// 3. Generate 404.html and login.html entrypoints across all targets
['dist', 'docs', 'portal', '.'].forEach(dir => {
  fs.writeFileSync(path.join(dir, '404.html'), distHtml, 'utf8');
  fs.writeFileSync(path.join(dir, 'login.html'), distHtml, 'utf8');
});

console.log('✓ Successfully synchronized production bundle to root index.html, docs/, portal/, assets/, 404.html and login.html');
