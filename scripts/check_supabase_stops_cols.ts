import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkCols() {
  const { data, error } = await supabase.from('stops').select('*').limit(5);
  console.log('Stops data keys:', Object.keys(data?.[0] || {}));
  console.log('Sample stop:', data?.[0]);

  // Check if any stop has road_corridor populated
  const { data: withCorridor, error: cErr } = await supabase
    .from('stops')
    .select('id, name, road_corridor')
    .not('road_corridor', 'is', null)
    .limit(5);
  console.log('Stops with road_corridor:', withCorridor);
}

checkCols().catch(console.error);
