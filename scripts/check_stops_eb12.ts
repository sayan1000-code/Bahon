import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr'
);

async function check() {
  const { data: supaStops } = await supabase.from('stops').select('*');
  const stopsJson = JSON.parse(fs.readFileSync('data/stops.json', 'utf8'));
  const jsonMap = new Map(stopsJson.map((s: any) => [s.id, s]));

  let matched = 0;
  for (const s of supaStops || []) {
    if (jsonMap.has(s.id)) matched++;
  }
  console.log(`Supabase stops: ${supaStops?.length}, matched in data/stops.json by ID: ${matched}`);

  // Also check route EB-12 stops
  const { data: routeEB12 } = await supabase.from('routes').select('*').eq('route_number', 'EB-12').single();
  console.log('EB-12 stop_sequence:', routeEB12.stop_sequence);
  const supaMap = new Map(supaStops?.map((s: any) => [s.id, s]));
  for (const sid of routeEB12.stop_sequence) {
    const st = supaMap.get(sid);
    const jst = jsonMap.get(sid);
    console.log(`- ${sid}: "${st?.name}" (${st?.lat}, ${st?.lng}) | JSON corridor: "${jst?.corridor || 'none'}"`);
  }
}

check().catch(console.error);
