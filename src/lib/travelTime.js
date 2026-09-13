import { getSanAngeloNeighborhood } from "@/lib/sanAngeloNeighborhoods";

// Home base: 3214 Alta Vista N., San Angelo, TX (College Hills area, north-central)
export const HOME_COORDS = { lat: 31.438, lng: -100.440 };

export const HOME_ADDRESS = "3214 Alta Vista Ln, San Angelo, TX";

// Approximate coordinates for San Angelo neighborhoods (lat, lng).
const NEIGHBORHOOD_COORDS = {
  Bentwood: [31.495, -100.437],
  "Country Club": [31.452, -100.440],
  Paulann: [31.398, -100.460],
  Bellview: [31.452, -100.490],
  "Red Creek": [31.380, -100.500],
  Bonham: [31.390, -100.460],
  Southland: [31.399, -100.470],
  Westridge: [31.435, -100.500],
  "Lake View": [31.468, -100.450],
  "North Ridge": [31.468, -100.440],
  "Quail Valley": [31.472, -100.420],
  Juniper: [31.400, -100.450],
  "Blue Creek": [31.370, -100.480],
  "Spring Creek": [31.360, -100.460],
  Laguna: [31.350, -100.460],
  "Bradford Park": [31.468, -100.480],
  "Rio Concho": [31.430, -100.490],
  Goliad: [31.400, -100.470],
  Glenmore: [31.410, -100.460],
  "San Angelo Estates": [31.330, -100.460],
  "College Hills": [31.438, -100.442],
  "Santa Rita": [31.430, -100.470],
  Downtown: [31.434, -100.456],
  "West San Angelo": [31.430, -100.490],
  "Knickerbocker (SW)": [31.400, -100.490],
  "Mathis Field": [31.358, -100.492],
  "South San Angelo": [31.370, -100.460],
  "Northwest San Angelo": [31.470, -100.490],
  "South Central": [31.420, -100.460],
  Central: [31.430, -100.450],
  "North San Angelo": [31.466, -100.450],
};

const CITY_CENTER = [31.434, -100.456];

function haversineMiles(a, b) {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function getCoords(address) {
  if (!address) return null;
  const n = getSanAngeloNeighborhood(address);
  return NEIGHBORHOOD_COORDS[n] || CITY_CENTER;
}

// Estimated drive minutes from the home base to an address (road factor ~1.4, ~30 mph city).
export function getTravelMinutes(address) {
  const c = getCoords(address);
  if (!c) return 0;
  const miles = haversineMiles([HOME_COORDS.lat, HOME_COORDS.lng], c);
  return Math.max(3, Math.round(miles * 1.4 * 2));
}

// Greedy nearest-neighbor route from home. Returns jobs in a suggested driving order.
export function planDayRoute(jobs) {
  const remaining = [...jobs];
  const route = [];
  let current = [HOME_COORDS.lat, HOME_COORDS.lng];
  while (remaining.length) {
    let best = 0;
    let bestDist = Infinity;
    remaining.forEach((j, i) => {
      const c = getCoords(j.customer_address);
      if (!c) return;
      const d = haversineMiles(current, c);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    const next = remaining.splice(best, 1)[0];
    route.push(next);
    const nc = getCoords(next.customer_address);
    if (nc) current = nc;
  }
  return route;
}

export function formatJobTime(seconds) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

// Estimate a full loop home -> wp1 -> ... -> wpN -> home (minutes) using neighborhood coords.
export function estimateLoopMinutes(waypoints) {
  let total = 0;
  const legs = [];
  let prev = [HOME_COORDS.lat, HOME_COORDS.lng];
  waypoints.forEach((w) => {
    const c = getCoords(w);
    const m = c ? Math.max(3, Math.round(haversineMiles(prev, c) * 1.4 * 2)) : 0;
    legs.push(m);
    total += m;
    if (c) prev = c;
  });
  const lastC = getCoords(waypoints[waypoints.length - 1]);
  const back = lastC ? Math.max(3, Math.round(haversineMiles(lastC, [HOME_COORDS.lat, HOME_COORDS.lng]) * 1.4 * 2)) : 0;
  legs.push(back);
  total += back;
  return { totalMinutes: total, legs };
}