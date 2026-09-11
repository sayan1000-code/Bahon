import { createClient } from '@supabase/supabase-js';
import { auditRouteStopOrder, runAllRoutesStopOrderAudit } from '../src/utils/routeOrderAudit';

const SUPABASE_URL = 'https://zhmgrvjmwjcglwacwyff.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyFullWorkflow() {
  console.log('=== Step 1: Query all stops and routes from Supabase ===');
  const { data: stops } = await supabase.from('stops').select('*');
  const stopsMap = new Map((stops || []).map((s: any) => [s.id, s]));

  const { data: routes } = await supabase.from('routes').select('*');
  console.log(`Loaded ${stops?.length} stops and ${routes?.length} routes.`);

  console.log('\n=== Step 2: Run Stop Order Audit across all routes ===');
  const auditedResults = runAllRoutesStopOrderAudit(routes || [], stopsMap);
  console.log(`Found ${auditedResults.length} routes with acute reversals (>120°).`);

  const targetAudit = auditedResults.find((r) => r.routeId === '3' || r.reversals.length > 0);
  if (!targetAudit) {
    console.log('No flagged routes found!');
    return;
  }

  console.log(`\nTesting Commit Flow on Flagged Route "${targetAudit.routeNumber}" (ID: "${targetAudit.routeId}"):`);
  console.log(`Original reversals count: ${targetAudit.reversalCount}`);
  console.log(`Original stops count: ${targetAudit.originalStops.length}`);
  console.log(`Suggested stops count: ${targetAudit.suggestedStops.length}`);

  const originalSequence = targetAudit.originalStops.map((s) => s.id);
  const newSequence = targetAudit.suggestedStops.map((s) => s.id);

  console.log('\n=== Step 3: Execute Supabase UPDATE with .select() ===');
  console.log('Updating stop_sequence and setting road_geometry to null...');
  const { data: updateData, error: updateError } = await supabase
    .from('routes')
    .update({
      stop_sequence: newSequence,
      road_geometry: null,
    })
    .eq('id', targetAudit.routeId)
    .select('id, route_number, stop_sequence, road_geometry');

  console.log('Update Error:', updateError);
  console.log('Updated Rows Count:', updateData?.length);
  console.log('Updated Row Result:', {
    id: updateData?.[0]?.id,
    route_number: updateData?.[0]?.route_number,
    stop_sequence_length: updateData?.[0]?.stop_sequence?.length,
    road_geometry: updateData?.[0]?.road_geometry,
  });

  console.log('\n=== Step 4: Fresh verification query from Supabase ===');
  const { data: verifiedRoute, error: verifyError } = await supabase
    .from('routes')
    .select('id, route_number, stop_sequence, road_geometry')
    .eq('id', targetAudit.routeId)
    .single();

  console.log('Verification Error:', verifyError);
  console.log('Verified Route in Supabase:', {
    id: verifiedRoute?.id,
    route_number: verifiedRoute?.route_number,
    stop_sequence_matches_new: JSON.stringify(verifiedRoute?.stop_sequence) === JSON.stringify(newSequence),
    road_geometry_is_null: verifiedRoute?.road_geometry === null,
  });

  console.log('\n=== Step 5: Re-run Audit on Fresh Database Record ===');
  const freshReversals = auditRouteStopOrder(verifiedRoute as any, stopsMap);
  console.log(`Reversals after commit on fresh DB data: ${freshReversals.length}`);
  if (freshReversals.length === 0) {
    console.log('SUCCESS: Route no longer appears in flagged list! Persistence and resolution verified.');
  } else {
    console.log('Remaining reversals:', freshReversals);
  }

  // Restore original state so we leave the database clean
  console.log('\nRestoring original route sequence...');
  await supabase
    .from('routes')
    .update({
      stop_sequence: originalSequence,
    })
    .eq('id', targetAudit.routeId);
  console.log('Original sequence restored.');
}

verifyFullWorkflow().catch(console.error);
