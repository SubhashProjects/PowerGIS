import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const files = fs.readdirSync('tests').filter(name => name.endsWith('.test.mjs')).sort();
let failed = 0;
for (const file of files) { const result = spawnSync(process.execPath, [path.join('tests', file)], { stdio: 'inherit' }); if (result.status !== 0) failed++; }
console.log(`Static regression tests: ${files.length - failed}/${files.length} passed.`);
if (failed) process.exit(1);
