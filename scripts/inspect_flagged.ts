import fs from 'fs';

const data = JSON.parse(fs.readFileSync('flagged_detour_stops.json', 'utf-8'));
const matches = data.filter((d: any) => /v1\(l\)|v-spike/i.test(JSON.stringify(d)));
console.log('Matches count:', matches.length);
console.log(matches.slice(0, 10));

// Also check all unique routeNumbers in flagged_detour_stops.json
const routeNums = new Set(data.map((d: any) => d.routeNumber));
console.log('Sample route numbers with V or L:', Array.from(routeNums).filter((r: any) => /v/i.test(r)));
