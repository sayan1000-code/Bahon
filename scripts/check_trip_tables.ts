import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr'
);

async function checkTables() {
  const { data: bData, error: bErr } = await supabase.from('boarded_trips').select('*').limit(1);
  console.log('boarded_trips query:', { data: bData, error: bErr?.message });

  const { data: fData, error: fErr } = await supabase.from('trip_feedback').select('*').limit(1);
  console.log('trip_feedback query:', { data: fData, error: fErr?.message });
}

checkTables().catch(console.error);
