const fs = require('fs');
const https = require('https');

const data = JSON.parse(fs.readFileSync('wbtc_master_routes.json', 'utf8'));

// Extract all unique unresolved stop names
const unresNamesSet = new Set();
for (const r of data) {
  for (const s of r.stops) {
    if (s.status !== 'OK' || s.lat === null || s.lng === null) {
      unresNamesSet.add(s.name.trim());
    }
  }
}

const unresNames = Array.from(unresNamesSet);
console.log('Total unique unresolved names to test:', unresNames.length);

function geocode(name) {
  return new Promise((resolve) => {
    // Clean name of OCR artifacts like '1', '2', '3', 'Via'
    const trimmed = name.trim();
    if (trimmed.length <= 2 || trimmed.toLowerCase() === 'via') {
      return resolve({ name, resolved: false, reason: 'noise_token' });
    }

    const queries = [
      name + ', Kolkata, West Bengal, India',
      name + ', West Bengal, India'
    ];

    let qIdx = 0;
    function tryNext() {
      if (qIdx >= queries.length) return resolve({ name, resolved: false, reason: 'not_found' });
      const q = encodeURIComponent(queries[qIdx]);
      qIdx++;
      const url = 'https://nominatim.openstreetmap.org/search?q=' + q + '&format=json&limit=1';
      https.get(url, { headers: { 'User-Agent': 'WBTC-Route-Resolver/2.0' }, timeout: 6000 }, (res) => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => {
          try {
            const j = JSON.parse(b);
            if (j.length > 0) {
              const lat = parseFloat(j[0].lat);
              const lng = parseFloat(j[0].lon);
              // Bounds check: lat 22.0 to 22.9, lng 88.0 to 88.8
              if (lat >= 22.0 && lat <= 22.9 && lng >= 88.0 && lng <= 88.8) {
                return resolve({ name, resolved: true, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), display: j[0].display_name });
              }
            }
          } catch(e) {}
          tryNext();
        });
      }).on('error', () => tryNext());
    }
    tryNext();
  });
}

async function run() {
  const results = {};
  for (let i = 0; i < unresNames.length; i++) {
    const name = unresNames[i];
    const r = await geocode(name);
    results[name] = r;
    if (r.resolved) {
      console.log([RESOLVED]  -> ,  ());
    } else {
      console.log([FAILED]  ());
    }
    await new Promise(res => setTimeout(res, 1000));
  }
  fs.writeFileSync('nominatim_results.json', JSON.stringify(results, null, 2));
  console.log('Finished geocoding all unresolved stops.');
}

run();
