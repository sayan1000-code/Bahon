import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const roadGeom = JSON.parse(fs.readFileSync('./src/data/roadGeometries.json', 'utf8'));

async function main() {
  const missingNums = ['VS2', 'T8', 'VS-1', 'WBTC C29', 'WBTC C31'];
  const { data: routes } = await supabase.from('routes').select('id, route_number, stop_sequence').in('route_number', missingNums);
  const segments = roadGeom.segments || {};

  for (const r of routes) {
    const stops = r.stop_sequence || [];
    let coveredPairs = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      const key1 = `${stops[i]}-${stops[i+1]}`;
      const key2 = `${stops[i+1]}-${stops[i]}`;
      if (segments[key1] || segments[key2]) {
        coveredPairs++;
      }
    }
    console.log(`Route ${r.route_number}: ${stops.length} stops, pairs covered in roadGeometries.json: ${coveredPairs}/${stops.length - 1}`);
  }
}

main().catch(console.error);
