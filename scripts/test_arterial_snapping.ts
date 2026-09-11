import fs from 'fs';
import path from 'path';

// Load the arterial network
const ways: Array<{
  id: number;
  name: string;
  ref: string;
  highway: string;
  geom: [number, number][];
}> = JSON.parse(fs.readFileSync(path.resolve('src/data/kolkataArterialRoads.json'), 'utf-8'));

console.log(`Loaded ${ways.length} arterial ways.`);

// Fast point-to-segment projection
function pDistance(x: number, y: number, x1: number, y1: number, x2: number, y2: number) {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) param = dot / len_sq;
  let xx: number, yy: number;
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
  const dx = (x - xx) * 111139;
  const dy = (y - yy) * 111139 * Math.cos((x * Math.PI) / 180);
  const distMeters = Math.hypot(dx, dy);
  return { distMeters, snapLat: xx, snapLng: yy, param };
}

// Bounding box index (grid buckets) for ultra-fast candidate lookup
const BUCKET_SIZE = 0.01; // ~1km grid
interface WaySegment {
  wayIndex: number;
  segIndex: number;
  name: string;
  ref: string;
  highway: string;
  p1: [number, number];
  p2: [number, number];
  bearing: number;
}

const grid = new Map<string, WaySegment[]>();

function getBucketKey(lat: number, lng: number) {
  const bLat = Math.floor(lat / BUCKET_SIZE);
  const bLng = Math.floor(lng / BUCKET_SIZE);
  return `${bLat}_${bLng}`;
}

function computeBearing(p1: [number, number], p2: [number, number]): number {
  const y = Math.sin(((p2[1] - p1[1]) * Math.PI) / 180) * Math.cos((p2[0] * Math.PI) / 180);
  const x =
    Math.cos((p1[0] * Math.PI) / 180) * Math.sin((p2[0] * Math.PI) / 180) -
    Math.sin((p1[0] * Math.PI) / 180) * Math.cos((p2[0] * Math.PI) / 180) * Math.cos(((p2[1] - p1[1]) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

for (let wIdx = 0; wIdx < ways.length; wIdx++) {
  const w = ways[wIdx];
  for (let sIdx = 0; sIdx < w.geom.length - 1; sIdx++) {
    const p1 = w.geom[sIdx];
    const p2 = w.geom[sIdx + 1];
    const seg: WaySegment = {
      wayIndex: wIdx,
      segIndex: sIdx,
      name: w.name,
      ref: w.ref,
      highway: w.highway,
      p1,
      p2,
      bearing: computeBearing(p1, p2),
    };

    const minLat = Math.min(p1[0], p2[0]);
    const maxLat = Math.max(p1[0], p2[0]);
    const minLng = Math.min(p1[1], p2[1]);
    const maxLng = Math.max(p1[1], p2[1]);

    const bLatMin = Math.floor(minLat / BUCKET_SIZE);
    const bLatMax = Math.floor(maxLat / BUCKET_SIZE);
    const bLngMin = Math.floor(minLng / BUCKET_SIZE);
    const bLngMax = Math.floor(maxLng / BUCKET_SIZE);

    for (let bLat = bLatMin; bLat <= bLatMax; bLat++) {
      for (let bLng = bLngMin; bLng <= bLngMax; bLng++) {
        const key = `${bLat}_${bLng}`;
        let list = grid.get(key);
        if (!list) {
          list = [];
          grid.set(key, list);
        }
        list.push(seg);
      }
    }
  }
}

console.log(`Indexed segments across ${grid.size} spatial buckets.`);

// Corridor alias map
const CORRIDOR_PATTERNS: Record<string, RegExp> = {
  VIP_ROAD: /kazi nazrul|vip/i,
  JESSORE_ROAD: /jessore|nh\s*12|nh\s*34/i,
  EM_BYPASS: /eastern metropolitan|e\.?m\.? bypass/i,
  BISWA_BANGLA: /biswa bangla|major arterial|mar/i,
  BT_ROAD: /barrackpore trunk|b\.?t\.? road/i,
  DIAMOND_HARBOUR: /diamond harbour/i,
  CENTRAL_AVE: /chittaranjan|jawaharlal nehru|central ave/i,
  BELGHORIA: /belghoria/i,
  KONA: /kona/i,
  GT_ROAD: /grand trunk|g\.?t\.? road/i,
  STRAND_ROAD: /strand/i,
};

// Known corridors by stop name substring
function inferCorridorFromStop(stopName: string): RegExp | null {
  const n = stopName.toLowerCase();
  if (/baguiati|kaikhali|haldiram|bangur|dum dum park|kestopur|teghoria|chinar park|airport gate/i.test(n)) {
    return CORRIDOR_PATTERNS.VIP_ROAD;
  }
  if (/nagerbazar|dum dum cant|birati|madhyamgram|barasat|airport gate no\.? 1|airport 1/i.test(n)) {
    return CORRIDOR_PATTERNS.JESSORE_ROAD;
  }
  if (/ruby|science city|chingrighata|kalikapur|ajay nagar|patuli|garia/i.test(n)) {
    return CORRIDOR_PATTERNS.EM_BYPASS;
  }
  if (/ecospace|unitech|ecopark|chinar park|shapoorji|biswa bangla|new town/i.test(n)) {
    return CORRIDOR_PATTERNS.BISWA_BANGLA;
  }
  if (/shyambazar|dunlop|barranagar|agarpara|sodepur|khardah|titagarh|barrackpore/i.test(n)) {
    return CORRIDOR_PATTERNS.BT_ROAD;
  }
  if (/taratala|behala|thakurpukur|joka/i.test(n)) {
    return CORRIDOR_PATTERNS.DIAMOND_HARBOUR;
  }
  return null;
}

export function snapStopToArterial(
  lat: number,
  lng: number,
  options?: {
    stopName?: string;
    corridorHint?: string;
    routeBearing?: number;
    maxSearchRadiusMeters?: number;
  }
): {
  snappedLat: number;
  snappedLng: number;
  distanceShiftMeters: number;
  roadName: string;
  roadType: string;
} {
  const maxRadius = options?.maxSearchRadiusMeters || 450; // up to 450m for deep pins like Baguiati
  const delta = (maxRadius / 111139) * 1.5;

  const bLatMin = Math.floor((lat - delta) / BUCKET_SIZE);
  const bLatMax = Math.floor((lat + delta) / BUCKET_SIZE);
  const bLngMin = Math.floor((lng - delta) / BUCKET_SIZE);
  const bLngMax = Math.floor((lng + delta) / BUCKET_SIZE);

  const seenSegments = new Set<string>();
  const candidates: Array<{
    seg: WaySegment;
    distMeters: number;
    snapLat: number;
    snapLng: number;
  }> = [];

  for (let bLat = bLatMin; bLat <= bLatMax; bLat++) {
    for (let bLng = bLngMin; bLng <= bLngMax; bLng++) {
      const segs = grid.get(`${bLat}_${bLng}`);
      if (!segs) continue;
      for (const s of segs) {
        const segKey = `${s.wayIndex}_${s.segIndex}`;
        if (seenSegments.has(segKey)) continue;
        seenSegments.add(segKey);

        const { distMeters, snapLat, snapLng } = pDistance(
          lat,
          lng,
          s.p1[0],
          s.p1[1],
          s.p2[0],
          s.p2[1]
        );
        if (distMeters <= maxRadius) {
          candidates.push({ seg: s, distMeters, snapLat, snapLng });
        }
      }
    }
  }

  if (candidates.length === 0) {
    return {
      snappedLat: lat,
      snappedLng: lng,
      distanceShiftMeters: 0,
      roadName: '',
      roadType: '',
    };
  }

  // Preference scoring:
  // 1. Matching named corridor (if known or inferred from stop name) -> 0.35x distance multiplier (huge preference)
  // 2. Road classification:
  //    - trunk / motorway: 0.6x
  //    - primary: 0.7x
  //    - secondary: 1.0x
  //    - links (*_link): 1.1x
  // 3. Direction alignment with route bearing: if within 35 degrees, 0.85x
  const targetCorridor =
    (options?.corridorHint && CORRIDOR_PATTERNS[options.corridorHint]) ||
    (options?.stopName ? inferCorridorFromStop(options.stopName) : null);

  let bestScore = Infinity;
  let bestCandidate = candidates[0];

  for (const c of candidates) {
    let score = c.distMeters;

    // Road classification weight
    const h = c.seg.highway;
    if (h === 'trunk' || h === 'motorway') {
      score *= 0.6;
    } else if (h === 'primary') {
      score *= 0.7;
    } else if (h.endsWith('_link')) {
      score *= 1.15;
    } else if (h === 'secondary') {
      score *= 1.0;
    }

    // Corridor name preference
    const roadFullName = `${c.seg.name} ${c.seg.ref}`;
    if (targetCorridor && targetCorridor.test(roadFullName)) {
      score *= 0.35; // Strongly snap to the desired corridor road!
    }

    // Direction alignment
    if (options?.routeBearing !== undefined) {
      const angleDiff = Math.abs((c.seg.bearing - options.routeBearing + 360) % 180);
      const acuteAngle = angleDiff > 90 ? 180 - angleDiff : angleDiff;
      if (acuteAngle < 35) {
        score *= 0.85;
      }
    }

    if (score < bestScore) {
      bestScore = score;
      bestCandidate = c;
    }
  }

  return {
    snappedLat: Math.round(bestCandidate.snapLat * 1e6) / 1e6,
    snappedLng: Math.round(bestCandidate.snapLng * 1e6) / 1e6,
    distanceShiftMeters: Math.round(bestCandidate.distMeters),
    roadName: bestCandidate.seg.name || bestCandidate.seg.ref || 'Unnamed Arterial',
    roadType: bestCandidate.seg.highway,
  };
}

// Test on EB-12 stops
const eb12Stops = [
  { name: 'Airport Gate 1', lat: 22.642204, lng: 88.436918 },
  { name: 'Kaikhali', lat: 22.634827, lng: 88.437361 },
  { name: 'Haldiram', lat: 22.627511, lng: 88.43447 },
  { name: 'Baguiati', lat: 22.613708, lng: 88.425873 },
  { name: 'Ultadanga', lat: 22.58431, lng: 88.39701 },
  { name: 'Kankurgachi', lat: 22.582898, lng: 88.394726 },
  { name: 'Maniktala', lat: 22.585144, lng: 88.3694 },
  { name: 'Girish Park', lat: 22.587608, lng: 88.361142 },
  { name: 'Burrabazar', lat: 22.580778, lng: 88.350805 },
  { name: 'Howrah Station', lat: 22.5838, lng: 88.3433 },
];

console.log('\n--- EB-12 Arterial Snapping Test ---');
for (const s of eb12Stops) {
  const res = snapStopToArterial(s.lat, s.lng, { stopName: s.name });
  console.log(
    `"${s.name}": (${s.lat}, ${s.lng}) -> (${res.snappedLat}, ${res.snappedLng}) | Shift: ${res.distanceShiftMeters}m onto "${res.roadName}" (${res.roadType})`
  );
}
