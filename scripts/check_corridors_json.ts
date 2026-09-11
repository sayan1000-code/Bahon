import fs from 'fs';

const stopsJson = JSON.parse(fs.readFileSync('data/stops.json', 'utf8'));
const corridors = new Set<string>();
for (const s of stopsJson) {
  if (s.corridor) corridors.add(s.corridor);
}
console.log(`Total stops in data/stops.json: ${stopsJson.length}`);
console.log(`Unique corridors count: ${corridors.size}`);
console.log('Sample corridors:', Array.from(corridors).slice(0, 15));
