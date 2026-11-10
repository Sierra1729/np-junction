/**
 * Utility for parsing GPS coordinate inputs in multiple formats:
 * - DMS with cardinal notation: "323729.87 n and 744508.50 e", "32° 37' 29.87" N, 74° 45' 08.50" E"
 * - Spaced DMS: "32 37 29.87 N, 74 45 08.50 E"
 * - Standard decimal degrees: "32.624964, 74.752361" or "32.624964 74.752361"
 */
export function parseCoordinateString(text: string): { lat: number; lng: number } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Check for cardinal direction DMS notation (N/S and E/W)
  const latMatch = trimmed.match(/([0-9\.\s°'"]+)\s*([ns])\b/i);
  const lngMatch = trimmed.match(/([0-9\.\s°'"]+)\s*([ew])\b/i);

  if (latMatch && lngMatch) {
    const parsePart = (valStr: string): number | null => {
      const s = valStr.replace(/[^0-9\.]/g, " ").trim();
      const tokens = s.split(/\s+/).filter(Boolean);
      if (tokens.length === 3) {
        return parseFloat(tokens[0]) + parseFloat(tokens[1]) / 60 + parseFloat(tokens[2]) / 3600;
      }
      if (tokens.length === 1) {
        const raw = tokens[0];
        const dotIdx = raw.indexOf(".");
        const intPart = dotIdx !== -1 ? raw.slice(0, dotIdx) : raw;
        const fracPart = dotIdx !== -1 ? raw.slice(dotIdx) : "";
        if (intPart.length >= 5) {
          const secInt = intPart.slice(-2);
          const min = intPart.slice(-4, -2);
          const deg = intPart.slice(0, -4);
          const sec = parseFloat(secInt + fracPart);
          return parseFloat(deg) + parseFloat(min) / 60 + sec / 3600;
        }
        return parseFloat(raw);
      }
      return null;
    };

    let lat = parsePart(latMatch[1]);
    let lng = parsePart(lngMatch[1]);
    if (lat !== null && lng !== null) {
      if (latMatch[2].toLowerCase() === "s") lat = -lat;
      if (lngMatch[2].toLowerCase() === "w") lng = -lng;
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }

  // 2. Standard decimal format: "32.6249, 74.7523" or "32.6249 74.7523"
  const parts = trimmed.split(/[\s,]+/);
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}
