import 'dotenv/config';

async function debugOption1() {
  const baseStops = [
    { name: 'Maniktala', lat: 22.585394, lng: 88.369433 },
    { name: 'Girish Park (Original)', lat: 22.587608, lng: 88.361142 },
    { name: 'Burrabazar', lat: 22.58071, lng: 88.35077 },
    { name: 'Howrah Station', lat: 22.583599, lng: 88.343724 },
  ];

  const coordParam = baseStops.map(s => `${s.lng.toFixed(6)},${s.lat.toFixed(6)}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordParam}?overview=full&geometries=geojson&steps=true&continue_straight=true`;

  const res = await fetch(url);
  const data = await res.json();
  const legs = data.routes[0].legs;
  console.log(`Route has ${legs.length} legs:`);
  for (let l = 0; l < legs.length; l++) {
    const leg = legs[l];
    console.log(`\nLeg ${l}: ${baseStops[l].name} -> ${baseStops[l + 1].name} (${(leg.distance / 1000).toFixed(2)} km)`);
    for (const step of leg.steps) {
      if (step.distance > 20) {
        console.log(`  - ${step.maneuver.type} ${step.maneuver.modifier || ''} onto "${step.name || 'unnamed'}" (${Math.round(step.distance)}m)`);
      }
    }
  }
}

debugOption1().catch(console.error);
