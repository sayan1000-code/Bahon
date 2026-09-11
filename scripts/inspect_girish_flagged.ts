import fs from 'fs';

const data = JSON.parse(fs.readFileSync('flagged_detour_stops.json', 'utf-8'));
const girishRecords = data.filter((d: any) => 
  /girish/i.test(d.stopName) || /girish/i.test(d.prevStopName) || /girish/i.test(d.nextStopName)
);
console.log('Girish records in flagged_detour_stops.json:', girishRecords.length);
for (const r of girishRecords) {
  console.log(`- Route ${r.routeNumber} (${r.routeId}): stop "${r.stopName}" (detour: ${r.detourMeters}m, extra: ${r.triangularExtraDistanceMeters}m) prev: "${r.prevStopName}", next: "${r.nextStopName}"`);
}
