import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr'
);

function pDistance(x: number, y: number, x1: number, y1: number, x2: number, y2: number) {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) param = dot / len_sq;
  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  const dx = x - xx;
  const dy = y - yy;
  const distMeters = Math.hypot(dx, dy * Math.cos((x * Math.PI) / 180)) * 111139;
  return { distMeters, snapLat: xx, snapLng: yy };
}

async function testSnapEB12() {
  const query = `
    [out:json][timeout:35];
    (
      way["highway"~"motorway|trunk|primary|secondary|trunk_link|primary_link|secondary_link"](22.35,88.15,22.75,88.55);
    );
    out geom;
  `;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: { 'User-Agent': 'KolkataBusTracker/1.0' }
  });
  const osmData = await res.json();
  const ways: any[] = osmData.elements || [];

  const { data: route } = await supabase.from('routes').select('*').eq('route_number', 'EB-12').single();
  const { data: allStops } = await supabase.from('stops').select('*');
  const stopsMap = new Map((allStops || []).map(s => [s.id, s]));
  const stops = route.stop_sequence.map((id: string) => stopsMap.get(id)).filter(Boolean);

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1 ? ~(result >> 1) : (result >> 1));
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1 ? ~(result >> 1) : (result >> 1));
    points.push([Math.round(lat / 1e5 * 1e6) / 1e6, Math.round(lng / 1e5 * 1e6) / 1e6]);
  }
  return points;
}

function polylineDistanceMeters(pts: [number, number][]): number {
  let d = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dLat = (pts[i + 1][0] - pts[i][0]) * 111139;
    const dLng = (pts[i + 1][1] - pts[i][1]) * 111139 * Math.cos((pts[i][0] * Math.PI) / 180);
    d += Math.hypot(dLat, dLng);
  }
  return d;
}

async function testRouteEB12Comparison() {
  const query = `
    [out:json][timeout:35];
    (
      way["highway"~"motorway|trunk|primary|secondary|trunk_link|primary_link|secondary_link"](22.35,88.15,22.75,88.55);
    );
    out geom;
  `;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: { 'User-Agent': 'KolkataBusTracker/1.0' }
  });
  const osmData = await res.json();
  const ways: any[] = osmData.elements || [];

  const { data: route } = await supabase.from('routes').select('*').eq('route_number', 'EB-12').single();
  const { data: allStops } = await supabase.from('stops').select('*');
  const stopsMap = new Map((allStops || []).map(s => [s.id, s]));
  const stops = route.stop_sequence.map((id: string) => stopsMap.get(id)).filter(Boolean);

  const originalGeom: [number, number][] = route.road_geometry || [];
  const origDist = polylineDistanceMeters(originalGeom);
  console.log(`Original EB-12 geometry: ${originalGeom.length} points, total length: ${(origDist / 1000).toFixed(2)} km`);

  // Snap stops to arterial roads (preferring VIP Road / Kazi Nazrul for Baguiati, Kaikhali, Haldiram)
  const snappedStops = stops.map(s => {
    let bestDist = Infinity;
    let bestSnap = [s.lat, s.lng];
    let bestRoad = '';

    for (const w of ways) {
      const geom = w.geometry || [];
      const name = w.tags?.name || w.tags?.ref || '';
      for (let i = 0; i < geom.length - 1; i++) {
        const { distMeters, snapLat, snapLng } = pDistance(
          s.lat, s.lng,
          geom[i].lat, geom[i].lon,
          geom[i + 1].lat, geom[i + 1].lon
        );
        // Bonus for matching arterial road corridor
        let effectiveDist = distMeters;
        if (/kazi nazrul|vip/i.test(name) && /baguiati|kaikhali|haldiram/i.test(s.name)) {
          effectiveDist *= 0.5; // strongly favor VIP Road
        }
        if (effectiveDist < bestDist) {
          bestDist = effectiveDist;
          bestSnap = [snapLat, snapLng];
          bestRoad = name;
        }
      }
    }
    return { lat: bestSnap[0], lng: bestSnap[1], name: s.name, road: bestRoad };
  });

  // Call Google Routes API with snapped stops
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  const origin = { location: { latLng: { latitude: snappedStops[0].lat, longitude: snappedStops[0].lng } } };
  const destination = { location: { latLng: { latitude: snappedStops[snappedStops.length - 1].lat, longitude: snappedStops[snappedStops.length - 1].lng } } };
  const intermediates = snappedStops.slice(1, -1).map(s => ({
    location: { latLng: { latitude: s.lat, longitude: s.lng } },
    via: true
  }));

  const gRes = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.polyline.encodedPolyline,routes.distanceMeters',
    },
    body: JSON.stringify({
      origin, destination, intermediates, travelMode: 'DRIVE', routingPreference: 'TRAFFIC_UNAWARE'
    })
  });

  const gData = await gRes.json();
  const enc = gData.routes?.[0]?.polyline?.encodedPolyline;
  if (enc) {
    const newGeom = decodePolyline(enc);
    const newDist = polylineDistanceMeters(newGeom);
    console.log(`\n✅ New Snapped EB-12 geometry: ${newGeom.length} points, total length: ${(newDist / 1000).toFixed(2)} km`);
    console.log(`Google reported distance: ${(gData.routes[0].distanceMeters / 1000).toFixed(2)} km`);
    console.log(`Length change: ${((newDist - origDist) / 1000).toFixed(2)} km`);
  } else {
    console.error('Google Routes error:', gData);
  }
}

testRouteEB12Comparison().catch(console.error);
