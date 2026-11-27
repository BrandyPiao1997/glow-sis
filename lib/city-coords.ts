// Approximate center of each city in the seed data, from a representative
// clinic ZIP code per city (looked up via api.zippopotam.us, Nov 2026;
// New York uses 10001 since most NYC clinics have no ZIP stored).
// The 56 cities from the Nov 26 8-metro expansion use their most common
// clinic ZIP the same way.
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
  "Alexandria": { lat: 38.806, lon: -77.0529 },
  "Annandale": { lat: 38.8307, lon: -77.2142 },
  "Arlington": { lat: 38.8926, lon: -77.0753 },
  "Atlanta": { lat: 33.832, lon: -84.3851 },
  "Aventura": { lat: 25.9597, lon: -80.1403 },
  "Bellaire": { lat: 29.7023, lon: -95.4611 },
  "Bellevue": { lat: 47.6155, lon: -122.2072 },
  "Bethesda": { lat: 39.0003, lon: -77.1022 },
  "Boston": { lat: 42.3492, lon: -71.0768 },
  "Brookline": { lat: 42.3431, lon: -71.123 },
  "Burlingame": { lat: 37.5671, lon: -122.3676 },
  "Cambridge": { lat: 42.3687, lon: -71.0836 },
  "Centreville": { lat: 38.8195, lon: -77.4558 },
  "Chamblee": { lat: 33.8879, lon: -84.2905 },
  "Chicago": { lat: 41.8923, lon: -87.6373 },
  "Coral Gables": { lat: 25.768, lon: -80.2714 },
  "Cypress": { lat: 29.9766, lon: -95.6358 },
  "Daly City": { lat: 37.6787, lon: -122.478 },
  "Doral": { lat: 25.8141, lon: -80.3549 },
  "Duluth": { lat: 34.026, lon: -84.147 },
  "Edmonds": { lat: 47.8061, lon: -122.3724 },
  "Fairfax": { lat: 38.8604, lon: -77.2649 },
  "Falls Church": { lat: 38.8856, lon: -77.1802 },
  "Fulshear": { lat: 29.7217, lon: -95.8977 },
  "Glenview": { lat: 42.0758, lon: -87.8223 },
  "Houston": { lat: 29.7446, lon: -95.4683 },
  "Johns Creek": { lat: 34.026, lon: -84.147 },
  "Katy": { lat: 29.7404, lon: -95.8304 },
  "Kirkland": { lat: 47.7188, lon: -122.1966 },
  "Lynnwood": { lat: 47.8049, lon: -122.2855 },
  "Malden": { lat: 42.4291, lon: -71.0605 },
  "Marietta": { lat: 33.9382, lon: -84.5403 },
  "Miami": { lat: 25.7672, lon: -80.2059 },
  "Miami Beach": { lat: 25.7873, lon: -80.1564 },
  "Millbrae": { lat: 37.6004, lon: -122.402 },
  "Naperville": { lat: 41.7896, lon: -88.169 },
  "Newton": { lat: 42.3341, lon: -71.1833 },
  "Niles": { lat: 42.0312, lon: -87.8112 },
  "North Bethesda": { lat: 39.0496, lon: -77.1204 },
  "Quincy": { lat: 42.2491, lon: -70.9978 },
  "Redmond": { lat: 47.6718, lon: -122.1232 },
  "Richmond": { lat: 29.6436, lon: -95.798 },
  "Rockville": { lat: 39.087, lon: -77.168 },
  "San Bruno": { lat: 37.6247, lon: -122.429 },
  "San Francisco": { lat: 37.7813, lon: -122.4167 },
  "San Mateo": { lat: 37.5735, lon: -122.3225 },
  "Sandy Springs": { lat: 33.9335, lon: -84.3958 },
  "Schaumburg": { lat: 42.0581, lon: -88.0482 },
  "Seattle": { lat: 47.6849, lon: -122.2968 },
  "Skokie": { lat: 42.0345, lon: -87.7541 },
  "South Miami": { lat: 25.7022, lon: -80.2978 },
  "Sugar Land": { lat: 29.5785, lon: -95.6066 },
  "Sunny Isles Beach": { lat: 25.9597, lon: -80.1403 },
  "Suwanee": { lat: 34.0425, lon: -84.0262 },
  "Tacoma": { lat: 47.2484, lon: -122.4644 },
  "Washington": { lat: 38.9087, lon: -77.0414 },
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
