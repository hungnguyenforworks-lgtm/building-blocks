// Real Swedish airfield coordinates
export const BASE_COORDS: Record<string, { lat: number; lng: number }> = {
  MOB:   { lat: 58.4065, lng: 15.5267 },  // Malmen (Linköping)
  FOB_N: { lat: 65.5438, lng: 22.1219 },  // Luleå/Kallax
  FOB_S: { lat: 56.2670, lng: 12.8514 },  // Ängelholm/F10
  ROB_N: { lat: 66.3228, lng: 20.1492 },  // Vidsel
  ROB_S: { lat: 56.2667, lng: 15.2650 },  // Ronneby/F17
  ROB_E: { lat: 61.2610, lng: 17.0990 },  // Söderhamn/F15
};

export const SUPPLY_LINES: [string, string][] = [
  ["MOB", "FOB_N"],
  ["MOB", "FOB_S"],
  ["MOB", "ROB_E"],
  ["FOB_N", "ROB_N"],
  ["FOB_S", "ROB_S"],
];

export const SWEDEN_CENTER = { lat: 62, lng: 16 };
export const INITIAL_ZOOM = 4.0;

export const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
