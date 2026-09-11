import fs from 'fs';
import path from 'path';

const raw = JSON.parse(fs.readFileSync(path.resolve('src/data/kolkataArterialRoads.json'), 'utf-8'));
console.log(`Loaded ${raw.length} ways.`);

const namedWays = raw.filter((w: any) => w.name || w.ref);
console.log(`Named or ref ways: ${namedWays.length}`);

// Check for VIP road, Jessore Road, EM bypass, etc.
const keywords = ['VIP', 'Kazi Nazrul', 'Jessore', 'Bypass', 'Biswa Bangla', 'Barrackpore', 'Diamond Harbour', 'Central', 'Chittaranjan', 'Strand', 'Gariahat', 'Ashutosh', 'Belghoria', 'Kona', 'Grand Trunk'];
for (const kw of keywords) {
  const matches = raw.filter((w: any) => new RegExp(kw, 'i').test(w.name) || new RegExp(kw, 'i').test(w.ref));
  console.log(`Keyword "${kw}": ${matches.length} ways (e.g. "${matches[0]?.name || ''}", "${matches[0]?.ref || ''}")`);
}
