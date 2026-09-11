function calculateCrossTrackDistance(
  p: [number, number],
  a: [number, number],
  b: [number, number]
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const latMid = toRad((a[0] + b[0]) / 2);
  const xB = (b[1] - a[1]) * (Math.PI / 180) * R * Math.cos(latMid);
  const yB = (b[0] - a[0]) * (Math.PI / 180) * R;
  const xP = (p[1] - a[1]) * (Math.PI / 180) * R * Math.cos(latMid);
  const yP = (p[0] - a[0]) * (Math.PI / 180) * R;
  const segmentLength = Math.hypot(xB, yB);
  if (segmentLength < 1e-6) return { perpDistanceMeters: Math.hypot(xP, yP) };
  const uX = xB / segmentLength;
  const uY = yB / segmentLength;
  const alongTrack = xP * uX + yP * uY;
  const perpX = xP - alongTrack * uX;
  const perpY = yP - alongTrack * uY;
  return { perpDistanceMeters: Math.hypot(perpX, perpY) };
}

const maniktala: [number, number] = [22.585144, 88.369400];
const burrabazar: [number, number] = [22.580778, 88.350805];

const oldGirish: [number, number] = [22.587608, 88.361142];
const newGirish: [number, number] = [22.585515, 88.362602];

console.log('Old Girish Perp Deviation:', Math.round(calculateCrossTrackDistance(oldGirish, maniktala, burrabazar).perpDistanceMeters), 'm');
console.log('New Girish Perp Deviation:', Math.round(calculateCrossTrackDistance(newGirish, maniktala, burrabazar).perpDistanceMeters), 'm');
