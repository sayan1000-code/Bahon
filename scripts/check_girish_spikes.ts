import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr'
);

function calculateCrossTrackDistance(
  p: [number, number],
  a: [number, number],
  b: [number, number]
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const latMid = toRad((a[0] + b[0]) / 2);
  const xB = (b[1] - a[1]) * (Math.PI / 180) * R * Math.cos(latMid);
  const yB = (b[0] - a[0]) * (Math.PI / 180) * R;
  const xP = (p[1] - a[1]) * (Math.PI / 180) * R * Math.cos(latMid);
  const yP = (p[0] - a[0]) * (Math.PI / 180) * R;
  const segmentLength = Math.hypot(xB, yB);
  if (segmentLength < 1e-6) return { perpDistanceMeters: Math.hypot(xP, yP) };
  const uX = xB / segmentLength;
  const uY = yB / segmentLength;
  const alongTrack = xP * uX + yP * uY;
  const perpX = xP - alongTrack * uX;
  const perpY = yP - alongTrack * uY;
  return { perpDistanceMeters: Math.hypot(perpX, perpY) };
}

async function checkRouteSpikes() {
  const { data: routes } = await supabase.from('routes').select('*');
  const { data: stops } = await supabase.from('stops').select('*');
  const stopsMap = new Map(stops?.map(s => [s.id, s]));

  const candidateRoutes = (routes || []).filter(r => 
    (r.stop_sequence || []).some((s: string) => s.includes('girish'))
  );

  console.log(`Checking ${candidateRoutes.length} candidate routes with Girish Park:`);
  for (const r of candidateRoutes) {
    const seq = r.stop_sequence || [];
    const stList = seq.map((id: string) => stopsMap.get(id)).filter(Boolean);
    
    // Find Girish Park index
    const gIdx = stList.findIndex((s: any) => s.id.includes('girish') || s.name.toLowerCase().includes('girish'));
    if (gIdx >= 0) {
      console.log(`\n========================================`);
      console.log(`Route: ${r.route_number || r.id} (${r.id}) - Stop Count: ${stList.length}`);
      console.log(`Girish Park at index ${gIdx}: ${stList[gIdx].name} (${stList[gIdx].lat}, ${stList[gIdx].lng})`);
      
      for (let i = 0; i < stList.length; i++) {
        const s = stList[i];
        let dev = 0;
        if (i > 0 && i < stList.length - 1) {
          const prev = stList[i - 1];
          const next = stList[i + 1];
          const res = calculateCrossTrackDistance([s.lat, s.lng], [prev.lat, prev.lng], [next.lat, next.lng]);
          dev = Math.round(res.perpDistanceMeters);
        }
        console.log(`  [${i}] ${s.id.padEnd(30)} "${s.name}" (${s.lat.toFixed(6)}, ${s.lng.toFixed(6)}) -> dev: ${dev}m`);
      }
    }
  }
}

checkRouteSpikes().catch(console.error);
