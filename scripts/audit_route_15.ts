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

async function auditRoute15() {
  const { data: route } = await supabase.from('routes').select('*').eq('route_number', '15').single();
  const { data: allStops } = await supabase.from('stops').select('*');
  const stopsMap = new Map((allStops || []).map(s => [s.id, s]));

  const stops = (route.stop_sequence || []).map((id: string) => stopsMap.get(id)).filter(Boolean);

  console.log('=== Route 15 Stop Sequence & V-Spike Perpendicular Deviation Audit ===\n');
  console.log('Stop Index | Stop ID               | Stop Name            | Coordinates          | Perp Deviation');
  console.log('------------------------------------------------------------------------------------------------');

  for (let i = 0; i < stops.length; i++) {
    const curr = stops[i];
    let dev = 0;
    if (i > 0 && i < stops.length - 1) {
      const prev = stops[i - 1];
      const next = stops[i + 1];
      const res = calculateCrossTrackDistance(
        [curr.lat, curr.lng],
        [prev.lat, prev.lng],
        [next.lat, next.lng]
      );
      dev = Math.round(res.perpDistanceMeters);
    }
    const idxStr = `[${i}]`.padEnd(10);
    const idStr = curr.id.padEnd(21);
    const nameStr = curr.name.padEnd(20);
    const coordStr = `(${curr.lat.toFixed(6)}, ${curr.lng.toFixed(6)})`.padEnd(22);
    const devStr = i === 0 || i === stops.length - 1 ? '0m (terminus)' : `${dev}m${dev > 150 ? ' ⚠️ SPIKE' : ''}`;
    console.log(`${idxStr} | ${idStr} | ${nameStr} | ${coordStr} | ${devStr}`);
  }
}

auditRoute15().catch(console.error);
