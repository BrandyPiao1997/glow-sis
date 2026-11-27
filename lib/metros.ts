// Metro areas for the location picker: groups of municipalities shown
// as ONE entry. Los Angeles is dozens of separate incorporated cities,
// while New York is a single municipality — without grouping, the picker
// was 34 LA-area towns plus New York. Clinic cards still show the real
// town and neighborhood; only the picker and filter are grouped.
//
// New cities from later expansions fall back to a metro of their own name
// (see metroOf) so they still show up — group them properly here when
// merging a new batch.
export const CITY_TO_METRO: Record<string, string> = {
  "Alhambra": "Los Angeles",
  "Arcadia": "Los Angeles",
  "Beverly Hills": "Los Angeles",
  "Burbank": "Los Angeles",
  "Cerritos": "Los Angeles",
  "Costa Mesa": "Los Angeles",
  "Culver City": "Los Angeles",
  "Diamond Bar": "Los Angeles",
  "El Monte": "Los Angeles",
  "Encino": "Los Angeles",
  "Fullerton": "Los Angeles",
  "Garden Grove": "Los Angeles",
  "Glendale": "Los Angeles",
  "Hacienda Heights": "Los Angeles",
  "Huntington Beach": "Los Angeles",
  "Irvine": "Los Angeles",
  "La Cañada Flintridge": "Los Angeles",
  "Long Beach": "Los Angeles",
  "Los Angeles": "Los Angeles",
  "Manhattan Beach": "Los Angeles",
  "Monterey Park": "Los Angeles",
  "New York": "New York",
  "Newport Beach": "Los Angeles",
  "North Hollywood": "Los Angeles",
  "Pasadena": "Los Angeles",
  "Rosemead": "Los Angeles",
  "Rowland Heights": "Los Angeles",
  "San Gabriel": "Los Angeles",
  "Santa Monica": "Los Angeles",
  "Sherman Oaks": "Los Angeles",
  "South Pasadena": "Los Angeles",
  "Studio City": "Los Angeles",
  "Torrance": "Los Angeles",
  "West Hollywood": "Los Angeles",
  "Woodland Hills": "Los Angeles",
};

export function metroOf(city: string): string {
  return CITY_TO_METRO[city] ?? city;
}
