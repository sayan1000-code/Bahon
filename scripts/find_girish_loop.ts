import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr'
);

function countSharpTurns(pts: [number, number][], minAngleDeg = 75): number {
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

// Detect if a polyline does a "loop" (comes back close to an earlier point within ~100m after traveling >300m)
function detectLoop(pts: [number, number][]): boolean {
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 10; j < Math.min(i + 80, pts.length); j++) {
      const d = Math.hypot(
        (pts[i][0] - pts[j][0]) * 111139,
        (pts[i][1] - pts[j][1]) * 111139 * Math.cos(pts[i][0] * Math.PI / 180)
      );
      if (d < 50) return true;
    }
  }
  return false;
}

async function findBoxyLoopRoutes() {
  const { data: routes } = await supabase.from('routes').select('*');
  const candidateRoutes = (routes || []).filter(r => 
    (r.stop_sequence || []).some((s: string) => s.includes('girish'))
  );

  console.log(`Analyzing ${candidateRoutes.length} routes around Girish Park:`);
  for (const r of candidateRoutes) {
    const geom: [number, number][] = r.road_geometry || [];
    // Girish Park bounding box
    const girishBox = geom.filter(p => p[0] >= 22.580 && p[0] <= 22.595 && p[1] >= 88.350 && p[1] <= 88.375);
    const hasLoop = detectLoop(girishBox);
    const turns = countSharpTurns(girishBox);
    console.log(`Route ${r.route_number.padEnd(8)}: girishPts=${girishBox.length}, sharpTurns=${turns}, hasLoop=${hasLoop}`);
  }
}

findBoxyLoopRoutes().catch(console.error);
