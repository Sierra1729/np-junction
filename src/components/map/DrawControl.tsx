import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import { GeoJsonGeometry } from "@/lib/agri-api/types";

interface DrawControlProps {
  onPolygonDrawn?: (geometry: GeoJsonGeometry) => void;
  onPinDropped?: (latLng: { lat: number; lng: number }) => void;
  enableDraw?: boolean;
}

export function DrawControl({
  onPolygonDrawn,
  onPinDropped,
  enableDraw = true,
}: DrawControlProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !enableDraw) return;

    // Initialize Geoman controls on the map
    map.pm.addControls({
      position: "topleft",
      drawMarker: true,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: false,
      drawText: false,
      editMode: true,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
    });

    map.pm.setPathOptions({
      color: "#f59e0b",
      fillColor: "#fbbf24",
      fillOpacity: 0.35,
      weight: 2.5,
    });

    const handleCreate = (e: { shape: string; layer: L.Layer }) => {
      const layer = e.layer;

      if (e.shape === "Marker" && "getLatLng" in layer) {
        const marker = layer as L.Marker;
        const ll = marker.getLatLng();
        if (onPinDropped) {
          onPinDropped({ lat: ll.lat, lng: ll.lng });
        }
      } else if (
        (e.shape === "Polygon" || e.shape === "Rectangle") &&
        "toGeoJSON" in layer
      ) {
        const poly = layer as L.Polygon;
        const geojson = poly.toGeoJSON();
        if (onPolygonDrawn && geojson.geometry) {
          onPolygonDrawn(geojson.geometry as GeoJsonGeometry);
        }
      }
    };

    map.on("pm:create", handleCreate);

    return () => {
      try {
        map.off("pm:create", handleCreate);
        if (map.pm && typeof map.pm.removeControls === "function") {
          map.pm.removeControls();
        }
      } catch {
        // Safe ignore during unmount transitions
      }
    };
  }, [map, enableDraw, onPolygonDrawn, onPinDropped]);

  return null;
}
