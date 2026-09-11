import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

import { STOPS } from '../src/data/transitData';

import fs from 'fs';

async function inspect() {
  const stopsJson = JSON.parse(fs.readFileSync('data/stops.json', 'utf8'));
  console.log(`stops.json count: ${stopsJson.length}`);
  console.log('Sample stops.json entry:', stopsJson[0]);

  const csv = fs.readFileSync('data/buscoordinates.csv', 'utf8').split('\n');
  console.log(`csv lines: ${csv.length}`);
  console.log('Sample csv line:', csv[1]);

  // Check how many Supabase stops match stops.json by id or name
  const { data: dbStops } = await supabase.from('stops').select('id, name, lat, lng');
  let matchId = 0;
  let matchName = 0;
  for (const s of dbStops || []) {
    if (stopsJson.find((x: any) => x.id === s.id)) matchId++;
    if (stopsJson.find((x: any) => x.name.toLowerCase() === s.name.toLowerCase())) matchName++;
  }
  console.log(`DB stops (${dbStops?.length}): ${matchId} match stops.json by id, ${matchName} match by name`);
}

inspect().catch(console.error);

