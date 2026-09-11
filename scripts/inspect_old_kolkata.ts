import fs from 'fs';

const items = JSON.parse(fs.readFileSync('./flagged_detour_stops.json', 'utf8'));
const oldKolkata = items.filter((s: any) => {
  const name = (s.stopName || '').toLowerCase();
  return (
    name.includes('bagbazar') ||
    name.includes('sovabazar') ||
    name.includes('shobha') ||
    name.includes('manicktala') ||
    name.includes('shyambazar') ||
    name.includes('hatibagan') ||
    name.includes('girish') ||
    name.includes('khanna') ||
    name.includes('central')
  );
});

console.log(`Found ${oldKolkata.length} flagged stops in Old Kolkata corridors:`);
oldKolkata.forEach((s: any) => {
  console.log(`• ${s.stopName} (${s.stopId}) on Route ${s.routeNumber}: ${s.detourMeters}m detour between "${s.prevStopName}" and "${s.nextStopName}" (coords: ${s.lat}, ${s.lng})`);
});
