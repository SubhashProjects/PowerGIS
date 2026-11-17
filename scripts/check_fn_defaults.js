import fs from 'fs';
import path from 'path';

const files = [
  ...fs.readdirSync('supabase/migrations').map(f => path.join('supabase/migrations', f)),
  'supabase/SUPABASE_ALL_IN_ONE_MASTER.sql',
  'supabase/seed.sql'
].filter(f => f.endsWith('.sql'));

let failCount = 0;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([a-zA-Z0-9_\.]+)\s*\(([\s\S]*?)\)\s*RETURNS/gi;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const name = m[1];
    const rawParams = m[2].replace(/\n/g, ' ').trim();
    if (!rawParams) continue;
    const parts = rawParams.split(',').map(s => s.trim());
    let sawDef = false;
    let defParam = '';
    for (let i = 0; i < parts.length; i++) {
      const isDef = /\bDEFAULT\b/i.test(parts[i]) || /=/.test(parts[i]);
      if (isDef) {
        sawDef = true;
        defParam = parts[i];
      } else if (sawDef) {
        failCount++;
        console.log(`FAIL in ${file}:`);
        console.log(`  Function: ${name}`);
        console.log(`  Param with default: ${defParam}`);
        console.log(`  Subsequent param WITHOUT default: ${parts[i]}`);
      }
    }
  }
}

if (failCount === 0) {
  console.log('ALL FUNCTION SIGNATURES VALID: 0 parameter default violations found across all files.');
} else {
  console.log(`Total violations: ${failCount}`);
  process.exit(1);
}
