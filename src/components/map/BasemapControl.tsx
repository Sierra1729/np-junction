import React from "react";
import { TileLayer } from "react-leaflet";

export type BasemapType = "google-hybrid" | "google-satellite" | "satellite" | "streets";

interface BasemapControlProps {
  basemap: BasemapType;
}

export function BasemapControl({ basemap }: BasemapControlProps) {
  if (basemap === "streets") {
    return (
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        minZoom={3}
        maxZoom={22}
        maxNativeZoom={19}
      />
    );
  }

  if (basemap === "google-satellite") {
    return (
      <TileLayer
        attribution='&copy; Google Maps'
        url="https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
        subdomains={["0", "1", "2", "3"]}
        minZoom={3}
        maxZoom={22}
        maxNativeZoom={20}
      />
    );
  }

  if (basemap === "satellite") {
    // Esri World Imagery fallback
    return (
      <TileLayer
        attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        minZoom={3}
        maxZoom={22}
        maxNativeZoom={19}
      />
    );
  }

  // Default: Google Hybrid (High-Resolution Satellite + Roads, Canals & Village Names)
  return (
    <TileLayer
      attribution='Map data &copy; Google'
      url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
      subdomains={["0", "1", "2", "3"]}
      minZoom={3}
      maxZoom={22}
      maxNativeZoom={20}
    />
  );
}
