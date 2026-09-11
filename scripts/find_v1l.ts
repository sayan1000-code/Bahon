import fs from 'fs';
import path from 'path';

function searchDir(dir: string, pattern: RegExp) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f === 'node_modules' || f === '.git' || f === 'dist') continue;
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      searchDir(full, pattern);
    } else {
      try {
        const content = fs.readFileSync(full, 'utf-8');
        if (pattern.test(content)) {
          console.log(`Found in: ${full}`);
        }
      } catch (e) {}
    }
  }
}

searchDir('.', /V1\(L\)|V1\s*\(L\)|V-spike/i);
