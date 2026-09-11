import fs from 'fs';

const roadGeom = JSON.parse(fs.readFileSync('./src/data/roadGeometries.json', 'utf8'));
const missingPairs = JSON.parse(fs.readFileSync('missing_pairs.json', 'utf8'));

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function interpolatePoints(from: { lat: number; lng: number }, to: { lat: number; lng: number }, steps = 15): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const lat = from.lat + (to.lat - from.lat) * frac;
    const lng = from.lng + (to.lng - from.lng) * frac;
    points.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  }
  return points;
}

async function fetchRoute(pair: any) {
  const { fromCoord, toCoord, key } = pair;
  const url = `http://router.project-osrm.org/route/v1/driving/${fromCoord.lng},${fromCoord.lat};${toCoord.lng},${toCoord.lat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'SmartCityBusTracker-Kolkata/1.0' } });
    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates; // [lng, lat]
        const latLngCoords: [number, number][] = coords.map((c: [number, number]) => [
          Number(c[1].toFixed(6)),
          Number(c[0].toFixed(6))
        ]);
        console.log(`✓ OSRM fetched for ${key} (${latLngCoords.length} points)`);
        return latLngCoords;
      }
    }
  } catch (err) {
    console.error(`Fetch error for ${key}:`, err);
  }

  console.warn(`! Falling back to linear interpolation for ${key}`);
  return interpolatePoints(fromCoord, toCoord);
}

async function main() {
  console.log(`Starting OSRM fetch for ${missingPairs.length} segments...`);
  let count = 0;
  for (const pair of missingPairs) {
    count++;
    console.log(`[${count}/${missingPairs.length}] Fetching ${pair.key}...`);
    const points = await fetchRoute(pair);
    roadGeom.segments[pair.key] = points;
    await sleep(600);
  }

  fs.writeFileSync('./src/data/roadGeometries.json', JSON.stringify(roadGeom, null, 2));
  console.log(`Done! roadGeometries.json updated. Total segments: ${Object.keys(roadGeom.segments).length}`);
}

main().catch(console.error);
