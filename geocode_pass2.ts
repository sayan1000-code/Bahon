import fs from 'fs';

const STOPS_TO_GEOCODE: Record<string, string[]> = {
  'Kalighat': ['Kalighat, Kolkata', 'Kalighat Temple, Kolkata'],
  'Chiria More': ['Chiria More, Dum Dum, Kolkata', 'Chiria More, Kolkata'],
  'Jadavpur': ['Jadavpur, Kolkata', 'Jadavpur University, Kolkata'],
  'Dhakuria': ['Dhakuria, Kolkata', 'Dhakuria Railway Station, Kolkata'],
  'Golpark': ['Golpark, Kolkata', 'Gariahat Golpark, Kolkata'],
  'Hridaypur': ['Hridaypur, Barasat, West Bengal', 'Hridaypur, North 24 Parganas'],
  'Doltala': ['Doltala, Madhyamgram, West Bengal', 'Doltala, Barasat, West Bengal'],
  'Tollygunge Phari': ['Tollygunge Phari, Kolkata', 'Tollygunge Police Station, Kolkata'],
  'Topsia': ['Topsia, Kolkata', 'Topsia More, Kolkata'],
  'Topsia More': ['Topsia More, Kolkata', 'Topsia, Kolkata'],
  'James Long Sarani': ['James Long Sarani, Behala, Kolkata', 'James Long Sarani, Kolkata'],
  'Princep Ghat': ['Prinsep Ghat, Kolkata', 'Prinsep Ghat, Strand Road, Kolkata'],
  'CIT Road': ['CIT Road, Entally, Kolkata', 'CIT Road, Phoolbagan, Kolkata'],
  'Dunlop More': ['Dunlop, Baranagar, Kolkata', 'Dunlop More, Kolkata'],
  'Bonhooghly': ['Bonhooghly, Kolkata', 'Bonhooghly, Baranagar, Kolkata'],
  'Sinthee More': ['Sinthee More, Kolkata', 'Sithi More, Kolkata'],
  'Central Avenue': ['Central Avenue, Kolkata', 'Chittaranjan Avenue, Kolkata'],
  'Park Circus': ['Park Circus 7 Point, Kolkata', 'Park Circus, Kolkata'],
  'Vivekananda Rd': ['Vivekananda Road, Kolkata', 'Girish Park, Kolkata'],
  'Dakshineswar': ['Dakshineswar, Kolkata', 'Dakshineswar Temple, Kolkata'],
  'Dum Dum Stn': ['Dum Dum Railway Station, Kolkata', 'Dum Dum Metro Station, Kolkata'],
  'Kudghat': ['Kudghat, Tollygunge, Kolkata', 'Kudghat Metro Station, Kolkata'],
  'Nabanna': ['Nabanna, Mandirtala, Howrah', 'Nabanna, Shibpur, Howrah'],
  'B.T. College': ['BT College, New Barrackpore, West Bengal', 'New Barrackpore, West Bengal'],
  'BT College': ['BT College, New Barrackpore, West Bengal'],
  'New Barrackpur B.T. College': ['New Barrackpore, West Bengal'],
  'Dhalai Bridge': ['Dhalai Bridge, Garia, Kolkata', 'Dhalai Bridge, Patuli, Kolkata'],
  'EM Bypass': ['EM Bypass, Kolkata', 'Eastern Metropolitan Bypass, Kolkata'],
  'EM Byapss': ['EM Bypass, Kolkata'],
  'EM ByPass Connector': ['EM Bypass Connector, Kolkata'],
  'V.I.P. Road': ['VIP Road, Kolkata'],
  // And also try the ones that failed before with refined queries
  'Subodh Mallick Square': ['Wellington Square, Nirmal Chandra Street, Kolkata', 'Ganesh Chandra Avenue, Kolkata'],
  'Subodh Mullick Square': ['Wellington Square, Nirmal Chandra Street, Kolkata'],
  'S. Mullick Sq.': ['Wellington Square, Nirmal Chandra Street, Kolkata'],
  'Grey St': ['Grey Street, Sovabazar, Kolkata', 'Arabinda Sarani, Kolkata'],
  'Grey Street': ['Grey Street, Sovabazar, Kolkata', 'Arabinda Sarani, Kolkata'],
  'Silpara': ['Silpara, Diamond Harbour Road, Kolkata', 'Silpara Bus Stand, Kolkata'],
  'Shilpara': ['Silpara, Diamond Harbour Road, Kolkata'],
  'Lake Kali Bari': ['Southern Avenue, Lake Market, Kolkata', 'Southern Avenue, Kolkata'],
  'Vidyasagar Setu': ['Vidyasagar Setu, Kolkata', 'Second Hooghly Bridge, Kolkata'],
  'PTS More': ['Police Training School, AJC Bose Road, Kolkata']
};

const cacheFile = 'geocoded_cache.json';
let cache: Record<string, { lat: number; lng: number; name: string; display_name: string }> = {};
if (fs.existsSync(cacheFile)) {
  cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  for (const [stopName, queries] of Object.entries(STOPS_TO_GEOCODE)) {
    if (cache[stopName]) {
      console.log(`Already cached: "${stopName}"`);
      continue;
    }
    let found = false;
    for (const q of queries) {
      console.log(`[Nominatim Pass 2] "${stopName}" -> "${q}"`);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'SmartCityBusTracker-Kolkata/1.0 (sayansingha1000@gmail.com)'
          }
        });
        if (res.status === 200) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            if (lat >= 22.35 && lat <= 22.85 && lng >= 88.15 && lng <= 88.55) {
              console.log(`  -> Found: ${lat}, ${lng} (${data[0].display_name.slice(0, 50)})`);
              cache[stopName] = { lat, lng, name: stopName, display_name: data[0].display_name };
              fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
              found = true;
              await sleep(1100);
              break;
            } else {
              console.log(`  -> Out of bounds: ${lat}, ${lng}`);
            }
          }
        }
      } catch (e) {
        console.error("  -> Fetch error:", e);
      }
      await sleep(1100);
    }
    if (!found) {
      console.warn(`❌ FAILED on "${stopName}"`);
    }
  }
  console.log("Pass 2 complete. Total cached stops:", Object.keys(cache).length);
}

run().catch(console.error);
