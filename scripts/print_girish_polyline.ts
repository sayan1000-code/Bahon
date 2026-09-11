import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr'
);

async function printGirishLoopPolyline(routeNum: string) {
  const { data: route } = await supabase.from('routes').select('*').eq('route_number', routeNum).single();
  const geom: [number, number][] = route.road_geometry || [];
  
  // Find points between Maniktala (lng ~88.370) and Burrabazar (lng ~88.350)
  const segment = geom.filter(p => p[1] >= 88.348 && p[1] <= 88.371 && p[0] >= 22.580 && p[0] <= 22.593);
  console.log(`Route ${routeNum} has ${segment.length} points between Maniktala and Burrabazar:`);
  for (let i = 0; i < segment.length; i++) {
    console.log(`  [${i}] ${segment[i][0].toFixed(6)}, ${segment[i][1].toFixed(6)}`);
  }
}

printGirishLoopPolyline('15').catch(console.error);
