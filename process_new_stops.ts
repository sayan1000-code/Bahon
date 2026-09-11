import fs from 'fs';
import { STOPS } from './src/data/transitData';
import { ALIASES, RAW_ROUTES } from './geocode_worker';

// Ensure alias corrections
ALIASES['howrah stn'] = 'howrah';
ALIASES['howrah station'] = 'howrah';
ALIASES['howrah'] = 'howrah';
ALIASES['kestopur/baguihati'] = 'baguihati';
ALIASES['baguiati'] = 'baguihati';
ALIASES['subodh mullick square'] = 'subodh mallick square';
ALIASES['s. mullick sq.'] = 'subodh mallick square';
ALIASES['pts more'] = 'pts';
ALIASES['bt college'] = 'b.t. college';
ALIASES['em byapss'] = 'em bypass';
ALIASES['em bypass connector'] = 'em bypass';
ALIASES['grey st'] = 'grey street';

const cache: Record<string, { lat: number; lng: number; name: string; display_name: string }> = JSON.parse(fs.readFileSync('geocoded_cache.json', 'utf8'));

// Build stop name to ID mapping
const stopRegistry = new Map<string, { id: string; name: string; lat: number; lng: number; isExisting: boolean }>();

for (const s of STOPS) {
  stopRegistry.set(s.id, { id: s.id, name: s.name, lat: s.lat, lng: s.lng, isExisting: true });
  stopRegistry.set(s.name.toLowerCase().trim(), { id: s.id, name: s.name, lat: s.lat, lng: s.lng, isExisting: true });
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const newStopsCreated: Array<{ id: string; name: string; code: string; platform: string; lat: number; lng: number; description: string }> = [];

for (const [rawName, geo] of Object.entries(cache)) {
  const key = rawName.toLowerCase().trim();
  if (!stopRegistry.has(key)) {
    let id = slugify(rawName);
    let counter = 1;
    while (STOPS.some(s => s.id === id) || newStopsCreated.some(s => s.id === id)) {
      id = `${slugify(rawName)}-${counter++}`;
    }
    const stopObj = {
      id,
      name: rawName,
      code: id.toUpperCase().slice(0, 4),
      platform: 'Bay 1',
      lat: Number(geo.lat.toFixed(6)),
      lng: Number(geo.lng.toFixed(6)),
      description: `WBTC stop at ${rawName}`
    };
    newStopsCreated.push(stopObj);
    stopRegistry.set(key, { id: stopObj.id, name: stopObj.name, lat: stopObj.lat, lng: stopObj.lng, isExisting: false });
    stopRegistry.set(stopObj.id, { id: stopObj.id, name: stopObj.name, lat: stopObj.lat, lng: stopObj.lng, isExisting: false });
  }
}

// Now wire ALIASES into stopRegistry
for (const [alias, target] of Object.entries(ALIASES)) {
  const targetKey = target.toLowerCase().trim();
  const entry = stopRegistry.get(targetKey);
  if (entry) {
    stopRegistry.set(alias.toLowerCase().trim(), entry);
  }
}

console.log("New stops created:", newStopsCreated.length);
fs.writeFileSync('new_stops.json', JSON.stringify(newStopsCreated, null, 2));

// Generate resolved routes
interface ResolvedRoute {
  number: string;
  name: string;
  type: string;
  color: string;
  bgBadge: string;
  textBadge: string;
  stops: string[];
  baseFare: number;
  farePerStop: number;
  skippedStops: string[];
}

const resolvedRoutes: ResolvedRoute[] = [];
const allSkipped = new Map<string, string[]>();

for (const r of RAW_ROUTES) {
  const stopIds: string[] = [];
  const skipped: string[] = [];
  for (const s of r.stops) {
    const key = s.toLowerCase().trim();
    const entry = stopRegistry.get(key);
    if (entry) {
      if (stopIds.length === 0 || stopIds[stopIds.length - 1] !== entry.id) {
        stopIds.push(entry.id);
      }
    } else {
      skipped.push(s);
    }
  }

  if (skipped.length > 0) {
    allSkipped.set(r.number, skipped);
  }

  const isAc = r.number.startsWith('AC') || r.number.startsWith('S-3W');
  const isElectric = r.number.startsWith('E');
  const type = isAc ? 'AC Express' : isElectric ? 'Electric' : 'Regular';
  const color = isAc ? '#2563EB' : isElectric ? '#059669' : '#D97706';
  const bgBadge = isAc ? 'bg-blue-600' : isElectric ? 'bg-emerald-600' : 'bg-amber-600';
  const textBadge = 'text-white';
  const baseFare = isAc ? 20 : 10;
  const farePerStop = isAc ? 4 : 2.5;

  resolvedRoutes.push({
    number: r.number,
    name: r.name,
    type,
    color,
    bgBadge,
    textBadge,
    stops: stopIds,
    baseFare,
    farePerStop,
    skippedStops: skipped
  });
}

console.log("\n--- RESOLVED ROUTES SUMMARY ---");
for (const rr of resolvedRoutes) {
  console.log(`Route ${rr.number.padEnd(6)}: ${rr.stops.length} stops | Skipped (${rr.skippedStops.length}): ${rr.skippedStops.join(', ') || 'none'}`);
}

fs.writeFileSync('resolved_routes.json', JSON.stringify(resolvedRoutes, null, 2));
