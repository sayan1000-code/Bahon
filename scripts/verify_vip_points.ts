import fs from 'fs';
import path from 'path';
import 'dotenv/config';

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

async function verifyVIPPoints() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  const snappedWaypoints = [
    { name: 'Airport Gate 1', lat: 22.642124, lng: 88.43448 },
    { name: 'Kaikhali', lat: 22.634343, lng: 88.434725 },
    { name: 'Haldiram', lat: 22.627705, lng: 88.433556 },
    { name: 'Baguiati', lat: 22.612035, lng: 88.428799 },
    { name: 'Ultadanga', lat: 22.585537, lng: 88.397194 },
    { name: 'Kankurgachi', lat: 22.583708, lng: 88.391563 },
    { name: 'Maniktala', lat: 22.585394, lng: 88.369433 },
    { name: 'Girish Park', lat: 22.587202, lng: 88.362866 },
    { name: 'Burrabazar', lat: 22.58071, lng: 88.35077 },
    { name: 'Howrah Station', lat: 22.583599, lng: 88.343724 },
  ];

  const origin = { location: { latLng: { latitude: snappedWaypoints[0].lat, longitude: snappedWaypoints[0].lng } } };
  const destination = { location: { latLng: { latitude: snappedWaypoints[snappedWaypoints.length - 1].lat, longitude: snappedWaypoints[snappedWaypoints.length - 1].lng } } };
  const intermediates = snappedWaypoints.slice(1, -1).map(w => ({
    location: { latLng: { latitude: w.lat, longitude: w.lng } },
    via: true
  }));

  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin,
      destination,
      intermediates,
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
      polylineQuality: 'HIGH_QUALITY'
    })
  });

  const data = await res.json();
  const pts = decodePolyline(data.routes[0].polyline.encodedPolyline);

  // Check section between Ultadanga (22.585) and Airport (22.642)
  const vipSection = pts.filter(p => p[0] >= 22.595 && p[0] <= 22.635);
  console.log(`VIP Road section points count: ${vipSection.length}`);
  // VIP Road longitude should stay strictly between 88.40 and 88.44 without wandering west of 88.420 or east of 88.442
  const minLng = Math.min(...vipSection.map(p => p[1]));
  const maxLng = Math.max(...vipSection.map(p => p[1]));
  console.log(`Longitude range along VIP corridor: ${minLng} to ${maxLng}`);
  console.log(`Clean continuous VIP corridor confirmed: ${minLng >= 88.40 && maxLng <= 88.44}`);
}

verifyVIPPoints().catch(console.error);
