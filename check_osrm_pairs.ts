import fs from 'fs';

const roadGeom = JSON.parse(fs.readFileSync('./src/data/roadGeometries.json', 'utf8'));
const resolvedRoutes = JSON.parse(fs.readFileSync('resolved_routes.json', 'utf8'));
const newStops = JSON.parse(fs.readFileSync('new_stops.json', 'utf8'));
import { STOPS } from './src/data/transitData';

const allStopsMap = new Map<string, { lat: number; lng: number }>();
for (const s of STOPS) {
  allStopsMap.set(s.id, { lat: s.lat, lng: s.lng });
}
for (const s of newStops) {
  allStopsMap.set(s.id, { lat: s.lat, lng: s.lng });
}

const neededPairs = new Set<string>();
for (const r of resolvedRoutes) {
  for (let i = 0; i < r.stops.length - 1; i++) {
    const s1 = r.stops[i];
    const s2 = r.stops[i + 1];
    if (s1 !== s2) {
      neededPairs.add(`${s1}-${s2}`);
      neededPairs.add(`${s2}-${s1}`); // Reverse too
    }
  }
}

const missingPairs: Array<{ key: string; from: string; to: string; fromCoord: { lat: number; lng: number }; toCoord: { lat: number; lng: number } }> = [];

for (const pair of neededPairs) {
  if (!roadGeom.segments[pair]) {
    const [s1, s2] = pair.split('-');
    const c1 = allStopsMap.get(s1);
    const c2 = allStopsMap.get(s2);
    if (c1 && c2) {
      missingPairs.push({ key: pair, from: s1, to: s2, fromCoord: c1, toCoord: c2 });
    }
  }
}

console.log(`Total stop pairs needed: ${neededPairs.size}`);
console.log(`Already present in roadGeometries: ${neededPairs.size - missingPairs.length}`);
console.log(`Missing pairs to fetch: ${missingPairs.length}`);
fs.writeFileSync('missing_pairs.json', JSON.stringify(missingPairs, null, 2));
