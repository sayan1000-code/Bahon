import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr'
);

async function updateGirishStops() {
  console.log('Updating Girish Park stop coordinates in Supabase...');

  // 1. Update girish_park
  const { data: g1, error: e1 } = await supabase
    .from('stops')
    .update({
      lat: 22.585515,
      lng: 88.362602
    })
    .eq('id', 'girish_park')
    .select();

  if (e1) {
    console.error('Failed to update girish_park:', e1.message);
  } else {
    console.log('✓ Updated girish_park:', g1);
  }

  // 2. Update girish_park_metro
  const { data: g2, error: e2 } = await supabase
    .from('stops')
    .update({
      lat: 22.585515,
      lng: 88.362602
    })
    .eq('id', 'girish_park_metro')
    .select();

  if (e2) {
    console.error('Failed to update girish_park_metro:', e2.message);
  } else {
    console.log('✓ Updated girish_park_metro:', g2);
  }
}

updateGirishStops().catch(console.error);
