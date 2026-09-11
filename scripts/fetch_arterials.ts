import fs from 'fs';
import path from 'path';

async function fetchArterials() {
  console.log('Fetching Kolkata arterial road network from Overpass API...');
  
  // Bounding box covering greater Kolkata transit network:
  // South: 22.30, West: 88.15, North: 22.80, East: 88.55
  const query = `
    [out:json][timeout:60];
    (
      way["highway"~"motorway|trunk|primary|secondary|trunk_link|primary_link|secondary_link"](22.30,88.15,22.80,88.55);
    );
    out geom;
  `;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ];

  let data = null;
  for (const ep of endpoints) {
    try {
      console.log(`Trying endpoint: ${ep}...`);
      const res = await fetch(ep, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: {
          'User-Agent': 'KolkataBusTracker/1.0 (transit-admin@bustracker.local)'
        }
      });
      if (res.ok) {
        data = await res.json();
        console.log(`Success from ${ep}!`);
        break;
      } else {
        console.warn(`Endpoint ${ep} returned ${res.status}`);
      }
    } catch (e: any) {
      console.warn(`Failed ${ep}: ${e.message}`);
    }
  }

  if (!data || !data.elements) {
    throw new Error('Failed to retrieve OSM arterial data from all Overpass endpoints.');
  }

  const elements: any[] = data.elements;
  console.log(`Retrieved ${elements.length} raw arterial ways.`);

  // Compact representation
  const compactWays = elements
    .filter(w => w.geometry && w.geometry.length >= 2)
    .map(w => ({
      id: w.id,
      name: w.tags?.name || '',
      ref: w.tags?.ref || '',
      highway: w.tags?.highway || '',
      geom: w.geometry.map((g: any) => [
        Math.round(g.lat * 1e6) / 1e6,
        Math.round(g.lon * 1e6) / 1e6
      ])
    }));

  const outPath = path.resolve('src/data/kolkataArterialRoads.json');
  fs.writeFileSync(outPath, JSON.stringify(compactWays));
  const stats = fs.statSync(outPath);
  console.log(`Saved ${compactWays.length} arterial ways to ${outPath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
}

fetchArterials().catch(console.error);
