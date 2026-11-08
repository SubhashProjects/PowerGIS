import fs from 'fs';
import path from 'path';

const roots = ['src', 'tests', 'supabase', 'README.md', 'index.html', '.env.example'];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  content = content.replace(/PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM/g, 'POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM');
  content = content.replace(/PUDUCHERRY ELECTRICITY GIS, ASSET MANAGEMENT & O&M PLATFORM/g, 'POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS & ASSET MANAGEMENT PLATFORM');
  content = content.replace(/Puducherry Electricity Department/gi, 'PowerGIS');
  content = content.replace(/Pondicherry Electricity Department/gi, 'PowerGIS');
  content = content.replace(/PUDUCHERRY ELECTRICITY/g, 'POWERGIS');
  content = content.replace(/Govt\. of Puducherry • Distribution Asset Management & O&M/g, 'PowerGIS • Distribution Asset Management & O&M');
  content = content.replace(/Government of Puducherry/gi, 'PowerGIS Enterprise');
  content = content.replace(/@electricity\.py\.gov\.in/g, '@powergis.internal');
  content = content.replace(/https:\/\/electricity\.py\.gov\.in/g, 'https://powergis.internal');
  content = content.replace(/electricity\.py\.gov\.in/g, 'powergis.internal');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    processFile(dir);
    return;
  }
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    const subStat = fs.statSync(fullPath);
    if (subStat.isDirectory()) {
      walkDir(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

for (const root of roots) {
  walkDir(root);
}

console.log('Rebranding scrub complete.');
