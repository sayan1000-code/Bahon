import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr'
);

function inspectLoop() {
  const coordParam = "88.384210,22.610521;88.397194,22.585537;88.391563,22.583708;88.369433,22.585394;88.362602,22.585515;88.350770,22.580710;88.343445,22.584455";
  fetch(`https://router.project-osrm.org/route/v1/driving/${coordParam}?overview=full&geometries=geojson&continue_straight=true`)
    .then(r => r.json())
    .then(data => {
      const pts = data.routes[0].geometry.coordinates.map(([lng, lat]: any) => [lat, lng]);
      console.log('Total points:', pts.length);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 10; j < Math.min(i + 80, pts.length); j++) {
          const d = Math.hypot(
            (pts[i][0] - pts[j][0]) * 111139,
            (pts[i][1] - pts[j][1]) * 111139 * Math.cos(pts[i][0] * Math.PI / 180)
          );
          if (d < 50) {
            console.log(`Loop detected between point [${i}] (${pts[i]}) and point [${j}] (${pts[j]}) - distance: ${d.toFixed(1)}m`);
            return;
          }
        }
      }
      console.log('No loop detected!');
    });
}

inspectLoop();
