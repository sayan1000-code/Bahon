import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zhmgrvjmwjcglwacwyff.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o7kVtg_dfblWvbA9sv2RKg_XXU_tlIr';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAFBiepK1ZtllEFBUGTD3CEqIJbwH9Ztkk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSingleRoute() {
  console.log('Testing Google Routes API on a route with null geometry...');
  const { data: route } = await supabase
    .from('routes')
    .select('*')
    .is('road_geometry', null)
    .limit(1)
    .single();

  if (!route) {
    console.log('No route with null geometry found.');
    return;
  }

  console.log(`Testing route ${route.id} (${route.route_number}), stops: ${route.stop_sequence.length}`);

  const { data: allStops } = await supabase.from('stops').select('*');
  const stopsMap = new Map((allStops || []).map(s => [s.id, s]));

  const stops = (route.stop_sequence || [])
    .map((id: string) => stopsMap.get(id))
    .filter(Boolean);

  console.log(`Found ${stops.length} stops for route.`);

  // Test calling Google Routes API
  const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
  const origin = {
    location: { latLng: { latitude: stops[0].lat, longitude: stops[0].lng } },
  };
  const destination = {
    location: { latLng: { latitude: stops[stops.length - 1].lat, longitude: stops[stops.length - 1].lng } },
  };
  const intermediates = stops.slice(1, -1).slice(0, 25).map((s: any) => ({
    location: { latLng: { latitude: s.lat, longitude: s.lng } },
    via: true,
  }));

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin,
      destination,
      intermediates,
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
      polylineQuality: 'HIGH_QUALITY',
    }),
  });

  console.log('Google Routes response status:', res.status);
  if (res.ok) {
    const data = await res.json();
    console.log('Success! Encoded polyline length:', data.routes?.[0]?.polyline?.encodedPolyline?.length);
  } else {
    console.log('Error text:', await res.text());
  }
}

testSingleRoute().catch(console.error);
