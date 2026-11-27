// Approximate center of each city in the seed data, from a representative
// clinic ZIP code per city (looked up via api.zippopotam.us, Nov 2026;
// New York uses 10001 since most NYC clinics have no ZIP stored).
// Used ONLY to pick the nearest city for "Locate me" — not for
// per-clinic distances; the seed data has street addresses, not lat/lng.
export const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  "New York": { lat: 40.7484, lon: -73.9967 },
  "Los Angeles": { lat: 34.0665, lon: -118.3022 },
  "Beverly Hills": { lat: 34.0901, lon: -118.4065 },
  "Irvine": { lat: 33.6607, lon: -117.8264 },
  "Pasadena": { lat: 34.1468, lon: -118.1391 },
  "Rowland Heights": { lat: 33.9818, lon: -117.8969 },
  "San Gabriel": { lat: 34.089, lon: -118.0955 },
  "Alhambra": { lat: 34.0914, lon: -118.1293 },
  "Santa Monica": { lat: 34.0176, lon: -118.4907 },
  "Glendale": { lat: 34.1556, lon: -118.2322 },
  "Newport Beach": { lat: 33.6295, lon: -117.8684 },
  "Costa Mesa": { lat: 33.6801, lon: -117.9085 },
  "Diamond Bar": { lat: 34.0066, lon: -117.8098 },
  "Monterey Park": { lat: 34.0534, lon: -118.1271 },
  "Arcadia": { lat: 34.1324, lon: -118.0264 },
  "West Hollywood": { lat: 34.0906, lon: -118.3788 },
  "Manhattan Beach": { lat: 33.8896, lon: -118.3996 },
  "Sherman Oaks": { lat: 34.1526, lon: -118.4322 },
  "North Hollywood": { lat: 34.151, lon: -118.3663 },
  "Burbank": { lat: 34.1717, lon: -118.3231 },
  "Fullerton": { lat: 33.8766, lon: -117.9551 },
  "Hacienda Heights": { lat: 33.9977, lon: -117.9652 },
  "Rosemead": { lat: 34.0658, lon: -118.0853 },
  "El Monte": { lat: 34.0705, lon: -118.0149 },
  "Culver City": { lat: 34.0168, lon: -118.3973 },
  "Encino": { lat: 34.1655, lon: -118.5175 },
  "Studio City": { lat: 34.143, lon: -118.3913 },
  "Woodland Hills": { lat: 34.1557, lon: -118.6 },
  "South Pasadena": { lat: 34.1109, lon: -118.1547 },
  "La Cañada Flintridge": { lat: 34.2217, lon: -118.2051 },
  "Huntington Beach": { lat: 33.721, lon: -118.0033 },
  "Long Beach": { lat: 33.7619, lon: -118.1341 },
  "Garden Grove": { lat: 33.7671, lon: -117.929 },
  "Cerritos": { lat: 33.8669, lon: -118.0686 },
  "Torrance": { lat: 33.8268, lon: -118.3118 },
};

// Farthest a user can be from a city center and still have it auto-selected.
export const LOCATE_MAX_MILES = 50;

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

// Nearest city in the data to a lat/lon, or null when every city is
// farther than LOCATE_MAX_MILES away.
export function nearestCity(lat: number, lon: number): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const [city, c] of Object.entries(CITY_COORDS)) {
    const d = haversineMiles(lat, lon, c.lat, c.lon);
    if (d < bestDist) {
      bestDist = d;
      best = city;
    }
  }
  return bestDist <= LOCATE_MAX_MILES ? best : null;
}
