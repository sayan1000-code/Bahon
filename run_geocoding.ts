import fs from 'fs';
import { ALIASES, RAW_ROUTES } from './geocode_worker';
import { STOPS } from './src/data/transitData';

const existingStopMap = new Map<string, any>();
for (const s of STOPS) {
  existingStopMap.set(s.id, s);
  existingStopMap.set(s.name.toLowerCase().trim(), s);
}

// Normalized search mapping for unmatched names to get clean Nominatim results
const SEARCH_HINTS: Record<string, string[]> = {
  'Hatibagan': ['Hatibagan, Kolkata', 'Hatibagan, West Bengal'],
  'Grey St': ['Grey Street, Kolkata', 'Shovabazar, Kolkata'],
  'Grey Street': ['Grey Street, Kolkata', 'Shovabazar, Kolkata'],
  'Nimtala Ghat St': ['Nimtala Ghat Street, Kolkata', 'Nimtala, Kolkata'],
  'B.K. Paul Ave': ['B.K. Paul Avenue, Kolkata', 'Sovabazar, Kolkata'],
  'Paikpara': ['Paikpara, Kolkata', 'Belgachia, Kolkata'],
  'Paikpara Xing': ['Paikpara, Kolkata'],
  'Padmapukur': ['Padmapukur, Sarat Bose Road, Kolkata', 'Padmapukur, Kolkata'],
  'Darga Rd': ['Darga Road, Park Circus, Kolkata', 'Beniapukur, Kolkata'],
  'Bondel Gate': ['Bondel Gate, Ballygunge, Kolkata', 'Bondel Road, Kolkata'],
  'Alipur Rd': ['Alipore Road, Kolkata', 'Alipore, Kolkata'],
  'Sarsuna': ['Sarsuna, Kolkata', 'Sarsuna Bus Stand, Kolkata'],
  'Bakultala': ['Bakultala, Behala, Kolkata'],
  'Manton Xing': ['Manton, Diamond Harbour Road, Kolkata', 'Behala Manton, Kolkata'],
  'Menton': ['Manton, Diamond Harbour Road, Kolkata'],
  'Casurina Ave': ['Casuarina Avenue, Maidan, Kolkata', 'Red Road, Kolkata'],
  'Bedon Square': ['Beadon Square, Kolkata', 'Girish Park, Kolkata'],
  'Ganguli Bagan': ['Ganguly Bagan, Kolkata', 'Baghajatin, Kolkata'],
  'Baghajatin': ['Baghajatin, Kolkata', 'Baghajatin Railway Station, Kolkata'],
  'D Park': ['Deshapriya Park, Kolkata', 'Rashbehari, Kolkata'],
  'PTS': ['Police Training School, AJC Bose Road, Kolkata', 'Race Course, Kolkata'],
  'PTS More': ['Police Training School, AJC Bose Road, Kolkata'],
  'Michael Nagar': ['Michael Nagar, Jessore Road, West Bengal', 'Michael Nagar, Kolkata'],
  'Mickelnagar': ['Michael Nagar, Jessore Road, West Bengal'],
  'Bankra More': ['Bankra, Birati, Kolkata', 'Birati, Kolkata'],
  'Bangur/Dum Dum Park': ['Dum Dum Park, Kolkata', 'Bangur Avenue, Kolkata'],
  'Satyanarayan Park': ['Satyanarayan Park, Burrabazar, Kolkata'],
  'Beliaghata Con.': ['Beliaghata Building More, Kolkata', 'Beliaghata, Kolkata'],
  'Shibanipit': ['Shibanipitha, Baruipur, West Bengal', 'Baruipur, West Bengal'],
  'Shibanipith': ['Shibanipitha, Baruipur, West Bengal'],
  'Baruipur/Padmapukur': ['Padmapukur, Baruipur, West Bengal', 'Baruipur, West Bengal'],
  'Malancha Bazar': ['Malancha, Baruipur, West Bengal', 'Baruipur, West Bengal'],
  'Harinavi': ['Harinavi, Rajpur Sonarpur, West Bengal', 'Harinavi, Kolkata'],
  'Mission Gate': ['Mission Gate, Narendrapur, Kolkata', 'Narendrapur, Kolkata'],
  'Ramkrishna Ashram': ['Ramakrishna Mission Ashram, Narendrapur', 'Behala, Kolkata'],
  'Motilal Gupta Road': ['Motilal Gupta Road, Kolkata', 'Barisha, Kolkata'],
  'Siriti More': ['Siriti More, Tollygunge, Kolkata', 'Siriti, Kolkata'],
  'Lake Gardens': ['Lake Gardens, Kolkata', 'Lake Gardens Railway Station, Kolkata'],
  'Babubazar': ['Babu Bazar, Khidirpur, Kolkata', 'Khidirpur, Kolkata'],
  'BNR More': ['BNR Hospital, Garden Reach, Kolkata', 'Garden Reach, Kolkata'],
  'Muduali': ['Mudiali, Garden Reach, Kolkata', 'Garden Reach, Kolkata'],
  'Kachhi Sarab': ['Kachhi Sadak, Garden Reach, Kolkata', 'Garden Reach, Kolkata'],
  'Garden Reach': ['Garden Reach, Kolkata', 'Garden Reach Road, Kolkata'],
  'Ramnagar': ['Ramnagar, Garden Reach, Kolkata', 'Metiabruz, Kolkata'],
  'Fatehpur': ['Fatehpur, Garden Reach, Kolkata', 'Metiabruz, Kolkata'],
  'Dackbanglow More': ['Dakbungalow More, Barasat, West Bengal', 'Barasat, West Bengal'],
  'Chinar Park': ['Chinar Park, Rajarhat, Kolkata', 'Rajarhat, Kolkata'],
  'Baruipur Hospital': ['Baruipur Hospital, West Bengal', 'Baruipur, West Bengal'],
  'Baruipur Station': ['Baruipur Railway Station, West Bengal', 'Baruipur, West Bengal'],
  'Khasmallick': ['Khasmallick, Baruipur, West Bengal', 'Baruipur, West Bengal'],
  'Rajpur Bazar': ['Rajpur Bazar, Rajpur Sonarpur, West Bengal', 'Rajpur, West Bengal'],
  'Narendrapur': ['Narendrapur, Kolkata', 'Narendrapur Railway Station, Kolkata'],
  'Mukundapur': ['Mukundapur, EM Bypass, Kolkata', 'Mukundapur, Kolkata'],
  'Uttar Panchannagram': ['Panchannagram, EM Bypass, Kolkata', 'VIP Bazar, Kolkata'],
  '4no. Bridge': ['4 No. Bridge, Park Circus, Kolkata', 'Park Circus, Kolkata'],
  'Chittaranjan Hospital': ['Chittaranjan National Medical College, Kolkata', 'Park Circus, Kolkata'],
  'Titagarh': ['Titagarh, West Bengal', 'Titagarh Railway Station, West Bengal'],
  'Khardah': ['Khardah, West Bengal', 'Khardah Railway Station, West Bengal'],
  'Sodepur Girja': ['Sodepur Church, Kolkata', 'Sodepur, Kolkata'],
  'Kamarhati': ['Kamarhati, Kolkata', 'Belgharia, Kolkata'],
  'Rathtala More': ['Rathtala, Belgharia, Kolkata', 'Belgharia, Kolkata'],
  'Tobin Road': ['Tobin Road, Kolkata', 'Bonhooghly, Kolkata'],
  'Rajballavpara': ['Rajballavpara, Bagbazar, Kolkata', 'Bagbazar, Kolkata'],
  'Bishnupur': ['Bishnupur, South 24 Parganas, West Bengal', 'Amtala, West Bengal'],
  'Khariberia': ['Khariberia, Bishnupur, West Bengal', 'Diamond Harbour Road, West Bengal'],
  'Bhasha 14no.': ['Bhasha, Bishnupur, South 24 Parganas, West Bengal', 'Pailan, Kolkata'],
  'Pailan': ['Pailan, Diamond Harbour Road, Kolkata', 'Pailan, Kolkata'],
  'Joka Bridge': ['Joka, Diamond Harbour Road, Kolkata'],
  'Shilpara': ['Silpara, Behala, Kolkata'],
  'Silpara': ['Silpara, Behala, Kolkata'],
  'Ekbalpur': ['Ekbalpore, Kolkata', 'Khidirpur, Kolkata'],
  'Bank of India': ['Bowbazar, Kolkata', 'Central Avenue, Kolkata'],
  'Stand Road': ['Strand Road, Kolkata', 'Fairlie Place, Kolkata'],
  'Ashoknagar': ['Ashoknagar Kalyangarh, West Bengal', 'Habra, West Bengal'],
  'Guma': ['Guma, North 24 Parganas, West Bengal', 'Habra, West Bengal'],
  'Bira': ['Bira, North 24 Parganas, West Bengal', 'Habra, West Bengal'],
  'Duttapukur': ['Duttapukur, North 24 Parganas, West Bengal', 'Barasat, West Bengal'],
  'Belaghata': ['Beliaghata, Kolkata', 'Beliaghata Main Road, Kolkata'],
  'Lake Kali Bari': ['Lake Kalibari, Southern Avenue, Kolkata', 'Southern Avenue, Kolkata'],
  'Mandirtala': ['Mandirtala, Shibpur, Howrah', 'Nabanna, Howrah'],
  'Vidyasagar Setu': ['Vidyasagar Setu Toll Plaza, Howrah', 'Vidyasagar Setu, Kolkata'],
  'Beckbagan': ['Beckbagan, Kolkata', 'AJC Bose Road, Kolkata'],
  'Wipro More': ['Wipro More, Salt Lake Sector V, Kolkata', 'Sector V, Salt Lake, Kolkata'],
  'Raja Rammohan Roy Rd': ['Raja Rammohan Roy Road, Behala, Kolkata', 'Siriti, Kolkata'],
  'Sukanta Setu': ['Sukanta Setu, Jadavpur, Kolkata', 'Jadavpur, Kolkata'],
  'Santoshpur': ['Santoshpur, Jadavpur, Kolkata', 'Santoshpur Railway Station, Kolkata'],
  'Central Jail': ['Dum Dum Central Jail, Kolkata', 'Dum Dum, Kolkata'],
  'Nager Bazar': ['Nagerbazar, Dum Dum, Kolkata', 'Nagerbazar, Kolkata'],
  'Colutala St': ['Colootola Street, Kolkata', 'College Street, Kolkata'],
  'Colutala Street': ['Colootola Street, Kolkata', 'College Street, Kolkata'],
  'Mayo Rd': ['Mayo Road, Kolkata', 'Maidan, Kolkata'],
  'Toll Plaza': ['Vidyasagar Setu Toll Plaza, Howrah', 'Mandirtala, Howrah'],
  'Subodh Mallick Square': ['Subodh Chandra Mallick Square, Kolkata', 'Wellington Square, Kolkata'],
  'Subodh Mullick Square': ['Subodh Chandra Mallick Square, Kolkata', 'Wellington Square, Kolkata'],
  'S. Mullick Sq.': ['Subodh Chandra Mallick Square, Kolkata', 'Wellington Square, Kolkata'],
  'C.A. Island': ['CA Block, Salt Lake, Kolkata', 'Salt Lake Sector 1, Kolkata'],
  'Seva Hospital': ['Ramakrishna Mission Seva Pratishthan, Sarat Bose Road, Kolkata', 'Sarat Bose Road, Kolkata'],
  'Baisaki Bhavan': ['Baisakhi, Salt Lake, Kolkata', 'Salt Lake Sector 1, Kolkata'],
  'Alambazar': ['Alambazar, Baranagar, Kolkata', 'Baranagar, Kolkata'],
  'Baghajatin Rd': ['Baghajatin Road, Baranagar, Kolkata', 'Baranagar, Kolkata'],
  'Baranagar Bazar': ['Baranagar Bazar, Kolkata', 'Baranagar, Kolkata'],
  'Bibir Bazar': ['Bibir Bazar, Cossipore, Kolkata', 'Cossipore, Kolkata'],
  'Cossipur': ['Cossipore, Kolkata', 'Cossipore Road, Kolkata'],
  'Bag Bazar': ['Bagbazar, Kolkata', 'Bagbazar Ghat, Kolkata'],
  'Chandi Ghosh': ['Chandi Ghosh Road, Kudghat, Kolkata', 'Kudghat, Kolkata'],
  'SLD Gate': ['SDF Building, Salt Lake, Kolkata'],
  'Weble House': ['Webel Bhavan, Salt Lake Sector V, Kolkata', 'Sector V, Salt Lake, Kolkata'],
  'Ranirashmoni Bazar': ['Rani Rashmoni Bazar, Beliaghata, Kolkata', 'Beliaghata, Kolkata'],
};

// Check geocoded cache
const cacheFile = 'geocoded_cache.json';
let cache: Record<string, { lat: number; lng: number; name: string; display_name: string }> = {};
if (fs.existsSync(cacheFile)) {
  try {
    cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch (e) {}
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeStop(rawName: string) {
  if (cache[rawName]) {
    return cache[rawName];
  }

  const queries = SEARCH_HINTS[rawName] || [`${rawName}, Kolkata`, `${rawName}, West Bengal`];

  for (const q of queries) {
    console.log(`[Nominatim] Querying for "${rawName}" -> "${q}"...`);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
    try {
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
          // Range check: Kolkata bounds lat 22.4-22.8, lng 88.2-88.5
          if (lat >= 22.35 && lat <= 22.85 && lng >= 88.15 && lng <= 88.55) {
            console.log(`  -> Found: ${lat}, ${lng} (${data[0].display_name.slice(0, 50)}...)`);
            cache[rawName] = {
              lat,
              lng,
              name: rawName,
              display_name: data[0].display_name
            };
            fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
            await sleep(1100);
            return cache[rawName];
          } else {
            console.log(`  -> Out of Kolkata bounds: ${lat}, ${lng} for "${q}"`);
          }
        }
      }
    } catch (err) {
      console.error(`  -> Fetch error on "${q}":`, err);
    }
    await sleep(1100);
  }

  console.warn(`❌ FAILED to geocode "${rawName}" across all candidate queries.`);
  return null;
}

async function main() {
  const allStopsNeeded = new Set<string>();
  for (const r of RAW_ROUTES) {
    for (const s of r.stops) {
      const key = s.toLowerCase().trim();
      if (!ALIASES[key] && !existingStopMap.has(key)) {
        allStopsNeeded.add(s);
      }
    }
  }

  console.log(`Total stops needing geocoding check: ${allStopsNeeded.size}`);
  let successCount = 0;
  let failCount = 0;

  for (const stopName of Array.from(allStopsNeeded)) {
    const result = await geocodeStop(stopName);
    if (result) successCount++;
    else failCount++;
  }

  console.log(`\nGeocoding complete. Succeeded: ${successCount}, Failed: ${failCount}`);
}

main().catch(console.error);
