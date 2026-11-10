import React from "react";
import { GeoJSON } from "react-leaflet";
import type { Layer } from "leaflet";
import { AgriFeature, AgriFeatureCollection } from "@/lib/agri-api/types";
import { formatAreaWithHectares } from "@/lib/units";
import {
  getPresentCropPrediction,
  formatCropDisplayName,
  formatSeasonLabel,
} from "@/lib/agri-api/crops";

// Distinct palette for major crops
const CROP_COLORS: Record<string, string> = {
  Rice: "#22c55e", // Bright Green (Paddy)
  Wheat: "#eab308", // Golden Yellow
  Mustard: "#facc15", // Yellow
  Gram: "#d97706", // Amber
  Soybeans: "#84cc16", // Lime Green
  Cotton: "#38bdf8", // Sky Blue
  Sugarcane: "#059669", // Emerald Dark
  Groundnut: "#b45309", // Warm Brown
  Corn: "#f59e0b", // Amber Orange
  Bajra: "#a16207", // Earthy Brown
  Sorghum: "#ca8a04", // Gold
  Chilli: "#ef4444", // Red
  UNKNOWN_CROP: "#a855f7", // Purple
  NO_PREDICTION: "#94a3b8", // Slate
};

interface FieldLayerProps {
  features: AgriFeatureCollection;
  selectedFieldIds?: string[];
  onFieldClick?: (feature: AgriFeature) => void;
  colorBy?: "crop" | "status" | "alu";
  highlightColor?: string;
}

export function FieldLayer({
  features,
  selectedFieldIds = [],
  onFieldClick,
  colorBy = "crop",
  highlightColor = "#10b981",
}: FieldLayerProps) {
  const selectedSet = new Set(selectedFieldIds);

  const styleFeature = (feature?: unknown) => {
    const f = feature as AgriFeature;
    if (!f || !f.properties) return {};

    const isSelected = selectedSet.has(f.id);
    const aluType = f.properties.alu_type;

    if (aluType === "farm_pond" || aluType === "other_water") {
      return {
        color: "#0284c7",
        weight: 1.5,
        fillColor: "#38bdf8",
        fillOpacity: 0.45,
      };
    }

    if (aluType === "dug_well") {
      return {
        color: "#0369a1",
        weight: 2.5,
        fillColor: "#06b6d4",
        fillOpacity: 0.75,
      };
    }

    if (aluType === "trees") {
      return {
        color: "#166534",
        weight: 1.5,
        fillColor: "#15803d",
        fillOpacity: 0.5,
      };
    }

    // Default: field
    let fillColor = "#10b981";
    const predictions = f.properties.monitoring_prediction;
    const presentPrediction = getPresentCropPrediction(predictions);
    const latestCrop = presentPrediction ? presentPrediction.crop_1 : undefined;

    if (colorBy === "crop" && latestCrop) {
      const normalizedKey = Object.keys(CROP_COLORS).find(
        (k) => k.toLowerCase() === latestCrop.toLowerCase()
      );
      fillColor = (normalizedKey ? CROP_COLORS[normalizedKey] : undefined) || "#64748b";
    }

    if (isSelected) {
      return {
        color: "#f59e0b",
        weight: 3.5,
        fillColor: "#10b981",
        fillOpacity: 0.65,
        dashArray: undefined,
      };
    }

    return {
      color: "#ffffff",
      weight: 1.5,
      fillColor,
      fillOpacity: 0.35,
    };
  };

  const onEachFeature = (feature: unknown, layer: Layer) => {
    const f = feature as AgriFeature;
    const props = f.properties;
    const isSelected = selectedSet.has(f.id);

    const presentPrediction = getPresentCropPrediction(props.monitoring_prediction);
    const cropLabel = presentPrediction
      ? `${formatCropDisplayName(presentPrediction.crop_1)} (${(presentPrediction.conf_1 * 100).toFixed(0)}%)`
      : "No Prediction";
    const seasonLabel = presentPrediction ? formatSeasonLabel(presentPrediction, true) : "";

    const areaText = formatAreaWithHectares(props.area_sq_m, "acre");

    const popupHtml = `
      <div style="font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.4; min-width: 180px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <strong style="color: #0f172a; font-size: 14px;">${props.farmer_name || f.id}</strong>
          <span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
            ${props.alu_type.toUpperCase()}
          </span>
        </div>
        ${props.farmer_id ? `<div style="color: #64748b; font-size: 11px;">ID: ${props.farmer_id}</div>` : ""}
        <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Area:</span>
            <span style="font-weight: 500;">${areaText}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 2px;">
            <span style="color: #64748b;">Present Crop:</span>
            <span style="font-weight: 600; color: #047857;">${cropLabel}</span>
          </div>
          ${seasonLabel ? `
          <div style="display: flex; justify-content: space-between; margin-top: 2px;">
            <span style="color: #64748b;">Season:</span>
            <span style="font-size: 11px; font-weight: 500; color: #475569;">${seasonLabel}</span>
          </div>` : ""}
          <div style="display: flex; justify-content: space-between; margin-top: 2px;">
            <span style="color: #64748b;">Boundary Conf:</span>
            <span style="font-weight: 500;">${(props.class_confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
        <div style="margin-top: 8px; font-size: 11px; text-align: center; color: ${isSelected ? '#dc2626' : '#059669'}; font-weight: 600;">
          ${isSelected ? "Click to deselect" : "Click to select plot"}
        </div>
      </div>
    `;

    layer.bindPopup(popupHtml);

    layer.on({
      click: () => {
        if (onFieldClick) {
          onFieldClick(f);
        }
      },
    });
  };

  // GeoJSON component requires unique key to re-render when selections change
  const renderKey = `fields-${features.features.length}-${selectedFieldIds.join(",")}`;

  return (
    <GeoJSON
      key={renderKey}
      data={features as unknown as GeoJSON.GeoJsonObject}
      style={styleFeature}
      onEachFeature={onEachFeature}
    />
  );
}
