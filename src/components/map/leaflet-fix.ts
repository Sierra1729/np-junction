import L from "leaflet";

let isFixed = false;

export function fixLeafletIcons() {
  if (typeof window === "undefined" || isFixed) return;

  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });

  isFixed = true;
}
