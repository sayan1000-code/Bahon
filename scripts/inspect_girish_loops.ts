import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr'
);

function countSharpTurns(pts: [number, number][], minAngleDeg = 60): number {
  let count = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];

    const v1 = [(p1[0] - p0[0]) * 111139, (p1[1] - p0[1]) * 111139 * Math.cos(p1[0] * Math.PI / 180)];
    const v2 = [(p2[0] - p1[0]) * 111139, (p2[1] - p1[1]) * 111139 * Math.cos(p1[0] * Math.PI / 180)];

    const len1 = Math.hypot(v1[0], v1[1]);
    const len2 = Math.hypot(v2[0], v2[1]);
    if (len1 < 10 || len2 < 10) continue;

    const dot = v1[0] * v2[0] + v1[1] * v2[1];
    const cosAngle = Math.max(-1, Math.min(1, dot / (len1 * len2)));
    const turnAngle = Math.acos(cosAngle) * (180 / Math.PI);
    if (turnAngle >= minAngleDeg) {
      count++;
    }
  }
  return count;
}

async function inspectGirishRoutes() {
  const { data: routes } = await supabase.from('routes').select('*');
  const matching = (routes || []).filter(r => 
    (r.stop_sequence || []).some((s: string) => s.includes('girish'))
  );

  console.log(`Checking ${matching.length} routes with Girish Park:`);
  for (const r of matching) {
    const geom: [number, number][] = r.road_geometry || [];
    // filter points near Girish Park (lat 22.582 to 22.592, lng 88.355 to 88.368)
    const girishPts = geom.filter(p => p[0] >= 22.582 && p[0] <= 22.592 && p[1] >= 88.355 && p[1] <= 88.368);
    const turns = countSharpTurns(girishPts, 70);
    console.log(`Route ${r.route_number || r.id} (${r.id}): ${girishPts.length} pts near Girish Park, ${turns} sharp turns`);
  }
}

inspectGirishRoutes().catch(console.error);
