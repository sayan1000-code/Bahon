import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zhmgrvjmwjcglwacwyff.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testUpdate() {
  console.log('Testing Supabase UPDATE with anon key...');
  const { data: route, error: readErr } = await supabase
    .from('routes')
    .select('id, route_number, stop_sequence, road_geometry')
    .limit(1)
    .single();

  if (readErr || !route) {
    console.error('Read error:', readErr);
    return;
  }

  console.log(`Testing update on route: id="${route.id}", number="${route.route_number}"`);
  console.log('Original stops count:', route.stop_sequence?.length);

  // Attempt update
  const { data: updateData, error: updateErr } = await supabase
    .from('routes')
    .update({
      stop_sequence: route.stop_sequence, // same sequence
    })
    .eq('id', route.id)
    .select();

  console.log('Update Error:', updateErr);
  console.log('Updated Rows count returned:', updateData?.length);
  console.log('Updated Data:', updateData);
}

testUpdate().catch(console.error);
