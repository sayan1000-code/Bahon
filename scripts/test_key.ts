import 'dotenv/config';

async function test() {
  const key = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBjCQYtuYAINzlGvNf3u4pnRdpuaTuE7mA';
  console.log('Testing key ending with:', key.slice(-6));
  const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: 22.5726, longitude: 88.3639 } } },
        destination: { location: { latLng: { latitude: 22.585, longitude: 88.345 } } },
        travelMode: 'DRIVE',
      }),
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response Body:', text);
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}
test();
