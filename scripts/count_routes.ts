import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.from('routes').select('id, route_number, stop_sequence, road_geometry');
  if (error) {
    console.error('Error fetching routes:', error);
    process.exit(1);
  }

  let nulls: string[] = [];
  let straight: { num: string; stops: number; pts: number }[] = [];
  let road: { num: string; stops: number; pts: number }[] = [];

  for (const r of data) {
    const num = r.route_number || r.id;
    const stops = r.stop_sequence?.length || 0;
    if (!r.road_geometry || !Array.isArray(r.road_geometry) || r.road_geometry.length < 2) {
      nulls.push(num);
    } else {
      const pts = r.road_geometry.length;
      if (pts <= stops + 2) {
        straight.push({ num, stops, pts });
      } else {
        road.push({ num, stops, pts });
      }
    }
  }

  console.log('SUMMARY:' + JSON.stringify({
    total: data.length,
    with_geometry: data.length - nulls.length,
    nullCount: nulls.length,
    straightCount: straight.length,
    roadCount: road.length,
    nullRoutes: nulls,
    straightSample: straight.slice(0, 10),
    roadSample: road.slice(0, 5)
  }));
}

main().catch(console.error);
