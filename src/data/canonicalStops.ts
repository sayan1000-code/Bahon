import { Stop } from '../types';

export interface StopCanonicalGroup {
  canonicalName: string;
  matches: string[];
  description?: string;
}

export interface CanonicalDestinationOption {
  id: string; // e.g. 'canonical:Ruby' or raw stop id
  canonicalName: string;
  displayName: string;
  subtitle: string;
  rawStopCount: number;
  stopIds: string[];
  representativeStop: Stop;
  isCanonicalGroup: boolean;
}

/**
 * 1. Canonical Name Mapping (Requirement 1 & 5)
 * Comprehensive dictionary of Kolkata transit hubs and stop clusters.
 * Seeded from wbtc_master_routes.json and database stops (all 48+ groups).
 * canonical_name text, matches text[]
 */
export const STOP_CANONICAL_GROUPS: StopCanonicalGroup[] = [
  {
    canonicalName: 'Ruby',
    matches: [
      'Ruby', 'Ruby Hospital', 'Ruby Crossing', 'Ruby General Hospital',
      'Ruby Xing', 'Ruby More', 'Ruby Hospital Crossing',
      'Ruby General Hospital Crossing', 'Ruby General Hospital More',
      'Ruby Hospital (Kasba Golpark)', 'Ruby Hospital Crossing (E.K. Thirumurai More)',
      'Rubi', 'Rubi Hospital'
    ],
    description: 'EM Bypass / Ruby Crossing & Hospital Node'
  },
  {
    canonicalName: 'Airport',
    matches: [
      'Airport', 'Airport Gate 1', 'Airport Gate No. 1', 'Airport Gate No',
      'Airport Gate No.1', 'Airport Port Gate No.3', 'Airport 1 No. Gate',
      'Airport Gate No. 1 (Destination)', 'Airport Gate 3',
      'Birati Crossing / Airport Gate 3', 'Kolkata Airport Terminal 2',
      'Kolkata Airport', 'Kolkata Airport (CCU)', 'CCU'
    ],
    description: 'Netaji Subhash Chandra Bose International Airport'
  },
  {
    canonicalName: 'Howrah',
    matches: [
      'Howrah', 'Howrah Station', 'Howrah Bridge', 'Howrah Bridge East',
      'Howrah Bridge East/Barabazar', 'Howrah Bridge (East)', 'Howrah Maidan',
      'Howrah Maidan (Origin)', 'Howrah Stn', 'Howrah Long Route Bus Stand',
      'Howrah Railway Station Bus Terminus', 'Howrah Station Bus Stand',
      'Howrah Station Bus Stand (Origin)', 'Howrah Station Bus Terminal',
      'Howrah Station Bus Terminus', 'Howrah Station Stand', 'Howrah Station Terminal',
      'Howrah Station Terminus', 'Howrah Bridge Approach',
      'Howrah Bridge Approach (Kolkata side)', 'Howrah Bridge East (Strand Road)',
      'Nabanna Terminal / Howrah'
    ],
    description: 'Howrah Railway Station & Bridge Transit Hub'
  },
  {
    canonicalName: 'Behala',
    matches: [
      'Behala', 'Behala Chowrasta', 'Behala Chowrastha', 'Behala chowrasta',
      'Behala Tram Depot', 'Behala 14 No.', 'Behala 14 No. Stand',
      'Behala Manton', 'Behala P.S', 'Behala Thana', 'Behala Thana (14 No.)',
      'Behala Chowrasta (Origin)', 'Behala Chowrasta Terminus',
      'Behala Flying Club Bus Stand'
    ],
    description: 'Behala Diamond Harbour Road Corridor'
  },
  {
    canonicalName: 'Tollygunge',
    matches: [
      'Tollygunge', 'Tollygunge Metro', 'Tollygunge Phari', 'Tollygunge Tram Depot',
      'Tollygunge Metro Stn', 'Mahanayak Uttam Kumar', 'Tollygunge Karunamoyee',
      'Karunamoyee (Tollygunge)'
    ],
    description: 'Tollygunge Metro & Tram Depot Hub'
  },
  {
    canonicalName: 'Taratala',
    matches: [
      'Taratala', 'Taratala Xing', 'Taratala xing', 'Taratala More',
      'Taratala Depot', 'Taratala State Garage', 'Taratala Xing – Pathakpara'
    ],
    description: 'Taratala Junction / Diamond Harbour Road'
  },
  {
    canonicalName: 'Thakurpukur',
    matches: [
      'Thakurpukur', 'Thakurpukur 3A', 'Thakurpukur 3A Bus Stand',
      'Thakurpukur Bazar', 'Thakurpukur 3A Stand', 'Thakurpukur/Joka'
    ],
    description: 'Thakurpukur 3A Bus Stand & Bazar'
  },
  {
    canonicalName: 'New Town',
    matches: [
      'New Town', 'New Town Bus Terminus', 'New Town Central Stand',
      'New Town Bus Stand', 'New Town/DLF', 'New Town (Sapoorji)',
      'New Town bus Stand', 'New Town Ecospace', 'New Town Bus Stand (DLF 1)',
      'Action Area I', 'Action Area III Stand'
    ],
    description: 'New Town Rajarhat Transit Corridor'
  },
  {
    canonicalName: 'Salt Lake',
    matches: [
      'Salt Lake', 'Salt Lake Depot', 'Salt Lake Gate', 'Salt Lake Depot Gate',
      'Salt Lake Sector V', 'Ultadanga - Salt Lake-Ultadanga'
    ],
    description: 'Salt Lake City & Bidhannagar'
  },
  {
    canonicalName: 'Garia',
    matches: [
      'Garia', 'Garia STn', 'Garia Station', 'Garia 6 No Bus Stand',
      'Garia 6 No. / Main Stand', 'Garia Bus Stand', 'Garia More',
      'Garia Mahamayatala', 'Garia Metro', 'Kavi Subhash'
    ],
    description: 'Garia Transit Interchange & Bus Terminus'
  },
  {
    canonicalName: 'Jadavpur',
    matches: [
      'Jadavpur', 'Jadavpur P.S', 'Jadavpur PS', 'Jadavpur Thana',
      'Jadavpur 8B', 'Jadavpur 8B Stand', 'Jadavpur University',
      'Jadavpore'
    ],
    description: 'Jadavpur 8B / University Hub'
  },
  {
    canonicalName: 'Karunamoyee',
    matches: [
      'Karunamoyee', 'Karunamoyee Bus Terminus', 'Karunamoyee (Salt Lake)',
      'Karunamoyee Central Park', 'Karunamoyee Bus Stand',
      'International Bus Terminus Karunamoyee'
    ],
    description: 'Karunamoyee Bus & Metro Terminal, Salt Lake'
  },
  {
    canonicalName: 'Barrackpore',
    matches: [
      'Barrackpore', 'Barrackpore Chiria More', 'Barrackpore Station',
      'Barrackpore Court', 'Barrackpore Stn', 'Barrackpur', 'Barrackpur Court',
      'BKP', 'BKP/Chiriamore', 'BKP Chiriamore'
    ],
    description: 'Barrackpore Station & Chiria More'
  },
  {
    canonicalName: 'Barasat',
    matches: [
      'Barasat', 'Barasat Depot', 'Barasat Champadali', 'Barasat Station',
      'Barasat Kazipara', 'Barasat Depot/Kazipara', 'Barasat/Ecospace',
      'W. B. State University (Barasat)'
    ],
    description: 'Barasat Champadali & Bus Terminus'
  },
  {
    canonicalName: 'Ultadanga',
    matches: [
      'Ultadanga', 'Ultadanga 15 No.Bus Stand', 'Ultadanga 15 No. Bus Stand',
      'Ultadanga/HUDCO', 'HUDCO/Ultadanga', 'HUDCO', 'Telengabagan'
    ],
    description: 'Ultadanga / HUDCO Transit Hub'
  },
  {
    canonicalName: 'Baruipur',
    matches: [
      'Baruipur', 'Baruipur New Terminus', 'Baruipur Hospital',
      'Baruipur Station', 'Baruipur Padmapukur', 'Baruipur/Padmapukur'
    ],
    description: 'Baruipur Station & Bus Terminus'
  },
  {
    canonicalName: 'Rashbehari',
    matches: [
      'Rashbehari', 'Rashbehari Xing', 'Rashbehari Ave', 'Rashbehari Avn',
      'Rashbehari Avenue Xing', 'RB Avenue', 'RB Av xing', 'RB Avenue xing',
      'R.B.Ave'
    ],
    description: 'Rashbehari Avenue Crossing'
  },
  {
    canonicalName: 'Hazra',
    matches: [
      'Hazra', 'Hazra Park', 'Hazra Crossing', 'Hazra Rd', 'Hazra More'
    ],
    description: 'Hazra Road & Crossing'
  },
  {
    canonicalName: 'Rabindra Sadan',
    matches: [
      'Rabindra Sadan', 'Rabindra Sadan/PTS', 'Exide', 'Exide Crossing',
      'Exide / Rabindra Sadan', 'Exide Crossing (Rabindra Sadan)', 'Rabindrasadan'
    ],
    description: 'Rabindra Sadan / Exide Crossing'
  },
  {
    canonicalName: 'Patuli',
    matches: [
      'Patuli', 'Patuli More', 'Patuli P.S', 'Dhalai Bridge',
      'Dhalai Bridge (Patuli)'
    ],
    description: 'Patuli / Dhalai Bridge Area'
  },
  {
    canonicalName: 'Esplanade',
    matches: [
      'Esplanade', 'Esplanade East', 'Esplanade (Dharmatala)',
      'Esplanade (Laldighi)', 'Dharmatala', 'Curzon Park'
    ],
    description: 'Esplanade (Dharmatala) Central Bus Terminus'
  },
  {
    canonicalName: 'College More',
    matches: [
      'College More', 'College More/SDF', 'Via: College More',
      'College More (Sector V)'
    ],
    description: 'College More, Salt Lake Sector V'
  },
  {
    canonicalName: 'College Street',
    matches: [
      'College Street', 'College Street/MG Road', 'College Street Xing',
      'College Street (Boi Para)', 'College Street Crossing'
    ],
    description: 'College Street / Boi Para'
  },
  {
    canonicalName: 'Beliaghata',
    matches: [
      'Beliaghata', 'Beliaghata Main Road', 'Beliaghata Con',
      'Beliaghata Xing', 'Beliaghata Building More', 'Beliaghata/CIT Rd. Xing',
      'Beliaghata Xing/Paribesh Bhavan', 'Kadapara/Beliaghata Xing'
    ],
    description: 'Beliaghata Main Road & Connector'
  },
  {
    canonicalName: 'Ballygunge',
    matches: [
      'Ballygunge', 'Ballygunge Station', 'Ballygunge Stn',
      'Ballygunge Phari', 'Ballygunge Circular Road'
    ],
    description: 'Ballygunge Station & Phari'
  },
  {
    canonicalName: 'Park Circus',
    matches: [
      'Park Circus', 'Park Circus 7-Point', 'Park Circus 7-Point Crossing',
      'Park Circus Bridge No. 4', '4 No. Bridge', '4no. Bridge'
    ],
    description: 'Park Circus 7-Point Crossing'
  },
  {
    canonicalName: 'Lake Town',
    matches: [
      'Lake Town', 'Lake Town Xing', 'Lake Town (Jaya Cinema)',
      'Lake Town Crossing', 'Laketown', 'Laketown Xing'
    ],
    description: 'Lake Town VIP Road Crossing'
  },
  {
    canonicalName: 'City Centre',
    matches: [
      'City Centre', 'City Centre I', 'City Centre II', 'City Centre 1',
      'City Centre 2', 'City Center', 'City Centre 1/Bhavans',
      'Akankha / City Centre 2 Crossing'
    ],
    description: 'City Centre (Salt Lake / New Town)'
  },
  {
    canonicalName: 'Girish Park',
    matches: [
      'Girish Park', 'Girish Park/C.R. Avn. Xing',
      'Girish Park/C.R. Avn. Xing./M.G.Road Xing', 'Girish Park Crossing',
      'Girish Park Metro'
    ],
    description: 'Girish Park Central Avenue Crossing'
  },
  {
    canonicalName: 'BBD Bag',
    matches: [
      'BBD Bag', 'BBD Bag/GPO', 'B.B.D. Bag', 'BBD.Bag', 'BBd Bag',
      'Dalhousie', 'Mission Row Xing/BBD Bag'
    ],
    description: 'BBD Bag (Dalhousie Square)'
  },
  {
    canonicalName: 'Eco Park',
    matches: [
      'Eco Park', 'ECO Park', 'Eco Space', 'Eco space', 'Ecospace',
      'New Town Ecospace', 'Akankha Crossing / Eco Park', 'Eco Park (Gate 1)'
    ],
    description: 'Eco Park & Ecospace, New Town'
  },
  {
    canonicalName: 'Kasba',
    matches: [
      'Kasba', 'Kasba PS', 'Kasba P.S', 'Kasba Depot Gate', 'Kasba Golpark',
      'Bijon Setu', 'Bijon Setu / Kasba'
    ],
    description: 'Kasba Depot & Golpark'
  },
  {
    canonicalName: 'Bally',
    matches: [
      'Bally', 'Bally Halt', 'Bally Ghat', 'Bally Bazar', 'Bally Municipality',
      'Bally Bazar/Municipality', 'Bally Khal', 'Bally Halt / Toll Plaza'
    ],
    description: 'Bally Halt & Ghat Hub'
  },
  {
    canonicalName: 'Joka',
    matches: [
      'Joka', 'Joka Bridge', 'Joka (IIM Calcutta)', 'Joka Bus Depot',
      'Thakurpukur/Joka'
    ],
    description: 'Joka / IIM Calcutta Hub'
  },
  {
    canonicalName: 'Rajabazar',
    matches: [
      'Rajabazar', 'Rajabazar Tram Depot', 'Rajabazar Crossing',
      'Rajabazar / Khanna Crossing', 'Sealdah (Rajabazar T.D.)'
    ],
    description: 'Rajabazar Tram Depot & Crossing'
  },
  {
    canonicalName: 'MG Road',
    matches: [
      'MG Road', 'M.G. Road', 'M.G.Road', 'MG Rd', 'M.G. Rd',
      'M.G.Road Xing', 'M.G.Road Jn', 'MG Road / Central Ave Crossing',
      'MG Road / College Street'
    ],
    description: 'Mahatma Gandhi Road Corridor'
  },
  {
    canonicalName: 'Topsia',
    matches: [
      'Topsia', 'Topsia More', 'Topsia Road Xing', 'Topsia Rd. Xing'
    ],
    description: 'Topsia Crossing & EM Bypass Connector'
  },
  {
    canonicalName: 'Madhyamgram',
    matches: [
      'Madhyamgram', 'Madhyamgram Chowrasta', 'Madhyamgram Chowrasta Xing',
      'Madhyamgram Chowmatha'
    ],
    description: 'Madhyamgram Chowrasta Hub'
  },
  {
    canonicalName: 'Dunlop',
    matches: [
      'Dunlop', 'Dunlop More', 'Dunlop Bridge', 'Dunlop Bus Stand'
    ],
    description: 'Dunlop Bridge / BT Road Hub'
  },
  {
    canonicalName: 'Santoshpur',
    matches: [
      'Santoshpur', 'Santoshpur Stn', 'Santoshpur Railway Gate',
      'Santoshpur Jadavpur', 'Akra Santoshpur / Rabindranagar Stand'
    ],
    description: 'Santoshpur Station & EM Bypass Connector'
  },
  {
    canonicalName: 'Shyambazar',
    matches: [
      'Shyambazar', 'Shyambazar 5-Point', 'Shyambazar 5-Point Crossing',
      'Shyambazar 5-Point Xing', 'Shyambazar Tram Depot'
    ],
    description: 'Shyambazar 5-Point Crossing'
  },
  {
    canonicalName: 'Unitech',
    matches: [
      'Unitech', 'Unitech Gate 2', 'Unitech (Infospace)', 'Infospace',
      'Karigari Bhavan / Unitech'
    ],
    description: 'Unitech Infospace, Action Area II'
  },
  {
    canonicalName: 'Titagarh',
    matches: [
      'Titagarh', 'Titagarh P.S', 'Titagarh Bazar Crossing', 'Titagarh Station'
    ],
    description: 'Titagarh BT Road Corridor'
  },
  {
    canonicalName: 'Kamalgazi',
    matches: [
      'Kamalgazi', 'Kamalgazi More', 'Kamalgazi Crossing', 'Kamalgazi Terminus',
      'Kamalgazi Bypass'
    ],
    description: 'Kamalgazi Bypass & Terminus'
  },
  {
    canonicalName: 'Gariahat',
    matches: [
      'Gariahat', 'Gariahat Crossing', 'Gariahat More', 'Gariahat Junction',
      'Gariahat Mall'
    ],
    description: 'Gariahat 4-Point Junction'
  },
  {
    canonicalName: 'Sealdah',
    matches: [
      'Sealdah', 'Sealdah Station', 'Sealdah Railway Station', 'Sealdah Court'
    ],
    description: 'Sealdah Railway Station Transit Hub'
  },
  {
    canonicalName: 'Park Street',
    matches: [
      'Park Street', 'Park street', 'Park St', 'Park Street Crossing',
      'Park Street Metro'
    ],
    description: 'Park Street / Chowringhee'
  },
  {
    canonicalName: 'Central Park',
    matches: [
      'Central Park', 'Central Park Metro', 'Bikash Bhavan / Central Park',
      'Central Park / Bikash Bhavan', 'Central Park / Bikash Bhawan',
      'Central Park / Unnayan Bhavan'
    ],
    description: 'Central Park / Bikash Bhavan, Salt Lake'
  },
  {
    canonicalName: 'Dum Dum',
    matches: [
      'Dum Dum', 'Dum Dum Stn', 'Dum Dum Station', 'Dum Dum 11A Stand',
      'Dum Dum Park', 'Bangur/Dum Dum Park', 'DumDum Chiria More', 'DumDum Stn'
    ],
    description: 'Dum Dum Station & Park'
  },
  {
    canonicalName: 'Baguihati',
    matches: [
      'Baguihati', 'Baguihati More', 'Baguihati Crossing', 'Baguihati VIP Road',
      'Kestopur/Baguihati'
    ],
    description: 'Baguihati VIP Road Hub'
  },
  {
    canonicalName: 'Shapoorji',
    matches: [
      'Shapoorji', 'Shapoorji Bus Terminus', 'Shapoorji Stand',
      'Sukhobristi / Shapoorji', 'Action Area III / Shapoorji',
      'Shapoorji Pallonji', 'Sukhobristi'
    ],
    description: 'Shapoorji Bus Terminus, Action Area III'
  },
  {
    canonicalName: 'SDF Building',
    matches: [
      'SDF', 'SDF Building', 'SDF More', 'SDF Sector V', 'SDF (Sector V)'
    ],
    description: 'SDF Building, Sector V Electronic Complex'
  },
  {
    canonicalName: 'Science City',
    matches: [
      'Science City', 'Since City', 'Science City Crossing', 'Sc. City', 'Sc.City'
    ],
    description: 'Science City / J.B.S. Haldane Avenue'
  },
  {
    canonicalName: 'EM Bypass',
    matches: [
      'EM Bypass', 'EM Byepass', 'EM ByPass Connector', 'E.M. Bypass',
      'E.M.Byepass', 'EM Byapss', 'EM bypass'
    ],
    description: 'Eastern Metropolitan Bypass Corridor'
  }
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pre-compute normalized lookups
const normalizedGroupMap = new Map<string, StopCanonicalGroup>();
const groupByNameMap = new Map<string, StopCanonicalGroup>();

for (const group of STOP_CANONICAL_GROUPS) {
  groupByNameMap.set(group.canonicalName.toLowerCase(), group);
  normalizedGroupMap.set(normalize(group.canonicalName), group);
  for (const alias of group.matches) {
    normalizedGroupMap.set(normalize(alias), group);
  }
}

/**
 * Checks if a stop (or string identifier) belongs to any canonical group.
 * Matches by exact alias, ID match, or first significant word/prefix match.
 */
export function getCanonicalGroupForStop(
  stopOrIdOrName: Stop | string | null | undefined,
  stops?: Stop[]
): StopCanonicalGroup | null {
  if (!stopOrIdOrName) return null;

  let rawName = '';
  let rawId = '';

  if (typeof stopOrIdOrName === 'object') {
    rawName = stopOrIdOrName.name || '';
    rawId = stopOrIdOrName.id || '';
  } else {
    // Check if it's a prefixed canonical id, e.g. 'canonical:Ruby'
    if (stopOrIdOrName.startsWith('canonical:')) {
      const cName = stopOrIdOrName.replace(/^canonical:/, '').trim().toLowerCase();
      return groupByNameMap.get(cName) || null;
    }

    rawName = stopOrIdOrName;
    rawId = stopOrIdOrName;

    // If a stops array is supplied, check if stopId exists in stops
    if (stops && stops.length > 0) {
      const found = stops.find((s) => s.id === stopOrIdOrName || s.name === stopOrIdOrName);
      if (found) {
        rawName = found.name;
        rawId = found.id;
      }
    }
  }

  // 1. Direct match on normalized name or ID
  const normName = normalize(rawName);
  if (normalizedGroupMap.has(normName)) {
    return normalizedGroupMap.get(normName)!;
  }

  const normId = normalize(rawId);
  if (normalizedGroupMap.has(normId)) {
    return normalizedGroupMap.get(normId)!;
  }

  // 2. Direct check against canonical group names & aliases with word boundary
  for (const group of STOP_CANONICAL_GROUPS) {
    const cNorm = normalize(group.canonicalName);
    if (
      normName === cNorm ||
      normName.startsWith(cNorm + ' ') ||
      normId === cNorm ||
      normId.startsWith(cNorm + ' ')
    ) {
      return group;
    }

    for (const alias of group.matches) {
      const aNorm = normalize(alias);
      if (normName === aNorm || normName.startsWith(aNorm + ' ')) {
        return group;
      }
    }
  }

  return null;
}

/**
 * Returns whether an ID represents a canonical group (e.g. 'canonical:Ruby').
 */
export function isCanonicalId(id: string): boolean {
  if (!id) return false;
  if (id.startsWith('canonical:')) return true;
  return groupByNameMap.has(id.toLowerCase());
}

const underlyingStopIdsCache = new Map<string, string[]>();

export function clearCanonicalCaches(): void {
  underlyingStopIdsCache.clear();
}

/**
 * Requirement 4: Given a canonical name or stop ID, return ALL underlying stop IDs
 * belonging to that canonical group across the stops database/fleet.
 * E.g. 'canonical:Ruby' or 'ruby' -> ['ruby_crossing', 'ruby_hospital', 'ruby_general_hospital', ...]
 *
 * Each route keeps using its own already-correct coordinate for its own stop instance!
 */
export function getAllUnderlyingStopIds(
  canonicalNameOrStopId: string | null | undefined,
  stops: Stop[] = []
): string[] {
  if (!canonicalNameOrStopId) return [];

  const cacheKey = `${canonicalNameOrStopId}_${stops.length}`;
  const cached = underlyingStopIdsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const group = getCanonicalGroupForStop(canonicalNameOrStopId, stops);
  if (!group) {
    const cleanId = canonicalNameOrStopId.replace(/^canonical:/, '');
    const res = [cleanId];
    underlyingStopIdsCache.set(cacheKey, res);
    return res;
  }

  const resultStopIds = new Set<string>();

  const cleanInput = canonicalNameOrStopId.replace(/^canonical:/, '');
  if (cleanInput && !cleanInput.startsWith('canonical:')) {
    resultStopIds.add(cleanInput);
  }

  // Find all stops in the database that belong to this group
  for (const stop of stops) {
    const stopGroup = getCanonicalGroupForStop(stop);
    if (stopGroup && stopGroup.canonicalName === group.canonicalName) {
      resultStopIds.add(stop.id);
    }
  }

  // Fallback alias matching across stops array
  for (const stop of stops) {
    const sNorm = normalize(stop.name);
    const idNorm = normalize(stop.id);
    for (const alias of group.matches) {
      const aNorm = normalize(alias);
      if (sNorm === aNorm || sNorm.includes(aNorm) || idNorm === aNorm || idNorm.includes(aNorm)) {
        resultStopIds.add(stop.id);
        break;
      }
    }
  }

  if (resultStopIds.size === 0 && cleanInput) {
    resultStopIds.add(cleanInput);
  }

  const res = Array.from(resultStopIds);
  underlyingStopIdsCache.set(cacheKey, res);
  return res;
}

/**
 * Returns a clean user-facing canonical display name for any stop ID or canonical ID.
 */
export function getCanonicalDisplayName(
  stopIdOrCanonical: string | null | undefined,
  stops: Stop[] = []
): string {
  if (!stopIdOrCanonical) return '';

  const group = getCanonicalGroupForStop(stopIdOrCanonical, stops);
  if (group) {
    return group.canonicalName;
  }

  const cleanId = stopIdOrCanonical.replace(/^canonical:/, '');
  const stop = stops.find((s) => s.id === cleanId);
  return stop ? stop.name : cleanId;
}

/**
 * Requirement 3: Build a deduplicated list of destination options for autocomplete/search.
 * Shows only ONE entry per canonical_name (not every raw variant),
 * so the user picks 'Ruby' once instead of choosing between 5-9 near-identical options.
 */
export function buildCanonicalDestinationOptions(
  availableStops: Stop[]
): CanonicalDestinationOption[] {
  const groupsMap = new Map<string, {
    group: StopCanonicalGroup;
    stops: Stop[];
  }>();

  const nonGroupedStops: Stop[] = [];

  for (const stop of availableStops) {
    const grp = getCanonicalGroupForStop(stop);
    if (grp) {
      if (!groupsMap.has(grp.canonicalName)) {
        groupsMap.set(grp.canonicalName, { group: grp, stops: [] });
      }
      groupsMap.get(grp.canonicalName)!.stops.push(stop);
    } else {
      nonGroupedStops.push(stop);
    }
  }

  const result: CanonicalDestinationOption[] = [];

  for (const [canonicalName, { group, stops }] of groupsMap.entries()) {
    const sortedStops = [...stops].sort((a, b) => a.name.length - b.name.length);
    const representative = sortedStops[0];
    const stopIds = stops.map((s) => s.id);
    const count = stops.length;

    result.push({
      id: `canonical:${canonicalName}`,
      canonicalName,
      displayName: canonicalName,
      subtitle: count > 1 ? `Transit Hub • ${count} stop locations` : (representative.code || 'Stop'),
      rawStopCount: count,
      stopIds,
      representativeStop: representative,
      isCanonicalGroup: true,
    });
  }

  for (const stop of nonGroupedStops) {
    result.push({
      id: stop.id,
      canonicalName: stop.name,
      displayName: stop.name,
      subtitle: stop.code || 'Stop',
      rawStopCount: 1,
      stopIds: [stop.id],
      representativeStop: stop,
      isCanonicalGroup: false,
    });
  }

  result.sort((a, b) => {
    if (a.isCanonicalGroup && !b.isCanonicalGroup) return -1;
    if (!a.isCanonicalGroup && b.isCanonicalGroup) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return result;
}
