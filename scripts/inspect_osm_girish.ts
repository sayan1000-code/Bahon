import fs from 'fs';

const ways: any[] = JSON.parse(fs.readFileSync('src/data/kolkataArterialRoads.json', 'utf-8'));
const girishWays = ways.filter(w => {
  const geom = w.geom || [];
  return geom.some((p: any) => p[0] >= 22.584 && p[0] <= 22.588 && p[1] >= 88.358 && p[1] <= 88.363);
});

console.log(`Found ${girishWays.length} arterial ways around Girish Park:`);
for (const w of girishWays) {
  console.log(`- Way ${w.id}: "${w.name}" (${w.highway}) with ${w.geom.length} nodes:`);
  for (const g of w.geom) {
    if (g[0] >= 22.584 && g[0] <= 22.588 && g[1] >= 88.358 && g[1] <= 88.363) {
      console.log(`    [${g[0]}, ${g[1]}]`);
    }
  }
}
