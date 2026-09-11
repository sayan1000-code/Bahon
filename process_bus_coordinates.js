import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const PRIMARY_CSV_PATH = path.join(DATA_DIR, 'buscoordinates.csv');
const FALLBACK_CSV_PATH = path.join(__dirname, 'Bus Route Name,Stoppage Name,Road.csv');
const STOPS_JSON_PATH = path.join(DATA_DIR, 'stops.json');
const ROUTES_JSON_PATH = path.join(DATA_DIR, 'routes.json');

/**
 * Standard RFC 4180 CSV parser with quotes and multi-line support
 */
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Creates a stable slug ID (e.g. "Jadavpur 8B Bus Stand" -> "jadavpur_8b_bus_stand")
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Parses duration text like "95 – 115 mins" or "60 mins" into average minutes as a number
 */
function parseDurationMinutes(durationStr) {
  if (!durationStr) return null;
  const numbers = durationStr.match(/\d+/g);
  if (!numbers || numbers.length === 0) return null;
  if (numbers.length === 1) return parseInt(numbers[0], 10);
  const min = parseInt(numbers[0], 10);
  const max = parseInt(numbers[1], 10);
  return Math.round((min + max) / 2);
}

/**
 * Main processing function
 */
export function processBusCoordinates() {
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Determine CSV source
  let csvPath = PRIMARY_CSV_PATH;
  if (!fs.existsSync(csvPath)) {
    if (fs.existsSync(FALLBACK_CSV_PATH)) {
      console.log(`[INFO] Copying ${FALLBACK_CSV_PATH} to ${PRIMARY_CSV_PATH}...`);
      fs.copyFileSync(FALLBACK_CSV_PATH, PRIMARY_CSV_PATH);
    } else {
      console.error(`[ERROR] CSV file not found at ${PRIMARY_CSV_PATH} or ${FALLBACK_CSV_PATH}`);
      process.exit(1);
    }
  }

  console.log(`[INFO] Reading CSV from: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const rawRows = parseCSV(csvContent);

  if (rawRows.length < 2) {
    console.error('[ERROR] CSV is empty or only contains a header.');
    process.exit(1);
  }

  // Identify column headers
  const header = rawRows[0].map(h => h.trim());
  console.log(`[INFO] CSV Header: ${JSON.stringify(header)}`);

  // Group rows into routes according to the rule:
  // "BUS NAME is only filled on the FIRST row of each route —
  //  every following row (blank BUS NAME) belongs to that same route, in order,
  //  until the next non-blank BUS NAME starts a new route."
  // Also handles CSVs where BUS NAME is repeated on every row.

  const parsedRoutes = [];
  let currentRoute = null;

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0 || row.every(c => !c.trim())) continue;

    let busName, stopName, corridor, alignment, latStr, lngStr, durationStr;

    // Support standard 7 columns, plus handle unquoted commas in corridor names
    if (row.length === 7) {
      [busName, stopName, corridor, alignment, latStr, lngStr, durationStr] = row;
    } else if (row.length > 7) {
      busName = row[0];
      stopName = row[1];
      alignment = row[row.length - 4];
      latStr = row[row.length - 3];
      lngStr = row[row.length - 2];
      durationStr = row[row.length - 1];
      corridor = row.slice(2, row.length - 4).join(', ');
    } else {
      continue;
    }

    busName = (busName || '').trim();
    stopName = (stopName || '').trim();
    corridor = (corridor || '').trim();
    alignment = (alignment || '').trim();
    durationStr = (durationStr || '').trim();
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (!stopName) continue;

    // Check if a new route starts:
    // Non-blank busName that differs from current route name
    if (busName && (!currentRoute || busName !== currentRoute.name)) {
      currentRoute = {
        name: busName,
        rawDuration: durationStr,
        stops: []
      };
      parsedRoutes.push(currentRoute);
    }

    if (currentRoute) {
      currentRoute.stops.push({
        stopName,
        corridor,
        alignment,
        lat,
        lng,
        durationStr
      });
    }
  }

  console.log(`[INFO] Parsed ${parsedRoutes.length} routes containing ${parsedRoutes.reduce((acc, r) => acc + r.stops.length, 0)} total stop occurrences.`);

  // Collect and deduplicate unique stops from the CSV
  const uniqueStopsMap = new Map(); // slugId -> stop object

  for (const route of parsedRoutes) {
    for (const stop of route.stops) {
      const slugId = generateSlug(stop.stopName);
      uniqueStopsMap.set(slugId, {
        id: slugId,
        name: stop.stopName,
        lat: stop.lat,
        lng: stop.lng,
        corridor: stop.corridor,
        alignment: stop.alignment
      });
    }
  }

  console.log(`[INFO] Unique stops identified across all routes: ${uniqueStopsMap.size}`);

  // -------------------------------------------------------------
  // Step 4: Merge Stops into data/stops.json
  // -------------------------------------------------------------
  let stopsAdded = 0;
  let stopsUpdated = 0;
  let existingStopsData = [];
  let isStopsArray = true;

  if (fs.existsSync(STOPS_JSON_PATH)) {
    try {
      const raw = fs.readFileSync(STOPS_JSON_PATH, 'utf8');
      existingStopsData = JSON.parse(raw);
      isStopsArray = Array.isArray(existingStopsData);
    } catch (err) {
      console.warn(`[WARN] Could not parse existing ${STOPS_JSON_PATH}, initializing new array.`);
      existingStopsData = [];
      isStopsArray = true;
    }
  }

  const stopDiffs = [];

  if (isStopsArray) {
    const stopsIndexMap = new Map(existingStopsData.map((s, idx) => [s.id, idx]));

    for (const [slugId, newStop] of uniqueStopsMap.entries()) {
      if (stopsIndexMap.has(slugId)) {
        const idx = stopsIndexMap.get(slugId);
        const existing = existingStopsData[idx];
        const oldCoords = { lat: existing.lat, lng: existing.lng, corridor: existing.corridor, alignment: existing.alignment };

        existing.lat = newStop.lat;
        existing.lng = newStop.lng;
        existing.corridor = newStop.corridor;
        existing.alignment = newStop.alignment;
        if (!existing.name) existing.name = newStop.name;

        stopsUpdated++;
        stopDiffs.push({ type: 'UPDATE', id: slugId, name: newStop.name, old: oldCoords, new: newStop });
      } else {
        existingStopsData.push(newStop);
        stopsIndexMap.set(slugId, existingStopsData.length - 1);
        stopsAdded++;
        stopDiffs.push({ type: 'ADD', id: slugId, name: newStop.name, new: newStop });
      }
    }
  } else {
    // Object/map format support
    for (const [slugId, newStop] of uniqueStopsMap.entries()) {
      if (existingStopsData[slugId]) {
        const existing = existingStopsData[slugId];
        const oldCoords = { lat: existing.lat, lng: existing.lng, corridor: existing.corridor, alignment: existing.alignment };

        Object.assign(existing, {
          lat: newStop.lat,
          lng: newStop.lng,
          corridor: newStop.corridor,
          alignment: newStop.alignment
        });
        if (!existing.name) existing.name = newStop.name;

        stopsUpdated++;
        stopDiffs.push({ type: 'UPDATE', id: slugId, name: newStop.name, old: oldCoords, new: newStop });
      } else {
        existingStopsData[slugId] = newStop;
        stopsAdded++;
        stopDiffs.push({ type: 'ADD', id: slugId, name: newStop.name, new: newStop });
      }
    }
  }

  fs.writeFileSync(STOPS_JSON_PATH, JSON.stringify(existingStopsData, null, 2), 'utf8');
  console.log(`[INFO] Saved stops to: ${STOPS_JSON_PATH}`);

  // -------------------------------------------------------------
  // Step 5: Merge Routes into data/routes.json
  // -------------------------------------------------------------
  let routesTouched = 0;
  let existingRoutesData = [];
  let isRoutesArray = true;

  if (fs.existsSync(ROUTES_JSON_PATH)) {
    try {
      const raw = fs.readFileSync(ROUTES_JSON_PATH, 'utf8');
      existingRoutesData = JSON.parse(raw);
      isRoutesArray = Array.isArray(existingRoutesData);
    } catch (err) {
      console.warn(`[WARN] Could not parse existing ${ROUTES_JSON_PATH}, initializing new array.`);
      existingRoutesData = [];
      isRoutesArray = true;
    }
  }

  const routeDetails = [];

  for (const route of parsedRoutes) {
    const routeSlug = generateSlug(route.name);
    const stopSequence = route.stops.map(s => generateSlug(s.stopName));
    const origin = route.stops[0].stopName;
    const destination = route.stops[route.stops.length - 1].stopName;
    const durationMinutes = parseDurationMinutes(route.rawDuration);

    const routeInfo = {
      id: routeSlug,
      number: route.name,
      name: route.name,
      origin,
      destination,
      durationMinutes,
      stopSequence
    };

    if (isRoutesArray) {
      const normName = route.name.toLowerCase().trim();
      const normSlug = routeSlug.toLowerCase().trim();
      const existing = existingRoutesData.find(r =>
        (r.id && (r.id.toLowerCase() === normSlug || r.id.toLowerCase() === normName)) ||
        (r.number && r.number.toLowerCase() === normName) ||
        (r.name && r.name.toLowerCase() === normName)
      );

      if (existing) {
        existing.stopSequence = stopSequence;
        existing.origin = origin;
        existing.destination = destination;
        existing.durationMinutes = durationMinutes;
        routesTouched++;
        routeDetails.push({ status: 'UPDATED', route: existing });
      } else {
        existingRoutesData.push(routeInfo);
        routesTouched++;
        routeDetails.push({ status: 'ADDED', route: routeInfo });
      }
    } else {
      // Object format support
      const key = Object.keys(existingRoutesData).find(k =>
        k.toLowerCase() === route.name.toLowerCase() ||
        k.toLowerCase() === routeSlug
      ) || routeSlug;

      if (existingRoutesData[key]) {
        existingRoutesData[key].stopSequence = stopSequence;
        existingRoutesData[key].origin = origin;
        existingRoutesData[key].destination = destination;
        existingRoutesData[key].durationMinutes = durationMinutes;
        routesTouched++;
        routeDetails.push({ status: 'UPDATED', route: existingRoutesData[key] });
      } else {
        existingRoutesData[key] = routeInfo;
        routesTouched++;
        routeDetails.push({ status: 'ADDED', route: routeInfo });
      }
    }
  }

  fs.writeFileSync(ROUTES_JSON_PATH, JSON.stringify(existingRoutesData, null, 2), 'utf8');
  console.log(`[INFO] Saved routes to: ${ROUTES_JSON_PATH}`);

  // -------------------------------------------------------------
  // Step 6: Print Summary and Diff
  // -------------------------------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('                 BUS COORDINATES MERGE SUMMARY');
  console.log('='.repeat(60));
  console.log(` Stops Added:    ${stopsAdded}`);
  console.log(` Stops Updated:  ${stopsUpdated}`);
  console.log(` Routes Touched: ${routesTouched}`);
  console.log('='.repeat(60));

  console.log('\n--- ROUTES PROCESSED ---');
  for (const rd of routeDetails) {
    const r = rd.route;
    console.log(`[${rd.status}] ${r.number.padEnd(18)} | Stops: ${String(r.stopSequence.length).padStart(2)} | Duration: ${String(r.durationMinutes).padStart(3)} mins | ${r.origin} ➔ ${r.destination}`);
  }

  console.log('\n--- SAMPLE STOP SLUG MAPPINGS (FIRST 5) ---');
  const sampleStops = Array.from(uniqueStopsMap.values()).slice(0, 5);
  for (const s of sampleStops) {
    console.log(`  ID:        ${s.id}`);
    console.log(`  Name:      ${s.name}`);
    console.log(`  Corridor:  ${s.corridor}`);
    console.log(`  Alignment: ${s.alignment}`);
    console.log(`  Coords:    ${s.lat}, ${s.lng}\n`);
  }

  return {
    stopsAdded,
    stopsUpdated,
    routesTouched,
    routeDetails,
    stopDiffs
  };
}

// Execute directly if run via node
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  processBusCoordinates();
}
