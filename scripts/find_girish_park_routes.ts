import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr'
);

async function findRoutes() {
  const { data: routes } = await supabase.from('routes').select('id, route_number, stop_sequence');
  const matching = (routes || []).filter(r => 
    (r.stop_sequence || []).some((s: string) => s.includes('girish') || s.includes('maniktala') || s.includes('chittaranjan'))
  );
  console.log(`Routes containing girish park / maniktala / etc.: ${matching.length}`);
  for (const r of matching) {
    console.log(`- ${r.route_number || r.id} (${r.id}): stops = ${r.stop_sequence.join(' -> ')}`);
  }
}

findRoutes().catch(console.error);
