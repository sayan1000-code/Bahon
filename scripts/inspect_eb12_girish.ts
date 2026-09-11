import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr'
);

async function inspectRouteAroundGirish(routeNum: string) {
  const { data: route } = await supabase.from('routes').select('*').eq('route_number', routeNum).single();
  const { data: stops } = await supabase.from('stops').select('*');
  const stopsMap = new Map(stops?.map(s => [s.id, s]));

  console.log(`\n========================================`);
  console.log(`Route: ${routeNum}`);
  console.log('Stop sequence:');
  const seq = route.stop_sequence || [];
  for (const sid of seq) {
    const st = stopsMap.get(sid);
    console.log(`  - ${sid}: "${st?.name}" (${st?.lat}, ${st?.lng})`);
  }

  // Look at stops near Girish Park: Maniktala -> Girish Park -> Burrabazar
  const maniktala = stopsMap.get('maniktala');
  const girish = stopsMap.get('girish_park') || stopsMap.get('girish_park_metro');
  const burra = stopsMap.get('burrabazar') || stopsMap.get('burrabazar_(posta)');

  console.log('\nKey stops:');
  console.log('Maniktala:', maniktala);
  console.log('Girish Park:', girish);
  console.log('Burrabazar:', burra);

  // Let's check the road_geometry coordinates around Girish Park
  const geom: [number, number][] = route.road_geometry || [];
  const girishGeom = geom.filter(p => p[0] >= 22.580 && p[0] <= 22.590 && p[1] >= 88.350 && p[1] <= 88.375);
  console.log(`\nGeometry points in Girish Park area (${girishGeom.length} points):`);
  for (let i = 0; i < Math.min(20, girishGeom.length); i++) {
    console.log(`  [${i}] ${girishGeom[i][0]}, ${girishGeom[i][1]}`);
  }
}

async function run() {
  await inspectRouteAroundGirish('15');
  await inspectRouteAroundGirish('EB-12');
  await inspectRouteAroundGirish('VS2');
}

run().catch(console.error);
