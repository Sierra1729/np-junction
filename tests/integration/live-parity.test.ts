import { describe, it, expect } from "vitest";
import { lookupLandscape, monitorLandscape } from "../../src/lib/agri-api/client";
import { latLngToS2CellIdLevel13 } from "../../src/lib/geo/s2";
import { parseLandscapeGeoJson } from "../../src/lib/agri-api/parser";

describe("Live/Mock Mode Parity Check", () => {
  it("confirms that querying by coordinates and by computed S2 cell ID returns the same field set", async () => {
    const lat = 18.624;
    const lng = 73.076;
    const s2CellId = latLngToS2CellIdLevel13(lat, lng);

    // Query 1: by coordinates
    const resByCoords = await lookupLandscape({
      locationSpecifier: { coordinates: { latitude: lat, longitude: lng }, s2CellId },
    });

    // Query 2: by s2CellId directly
    const resByCell = await lookupLandscape({
      locationSpecifier: { s2CellId },
    });

    const fcCoords = parseLandscapeGeoJson(resByCoords.landscape.geojson);
    const fcCell = parseLandscapeGeoJson(resByCell.landscape.geojson);

    // Verify feature count parity
    expect(fcCoords.features.length).toBe(fcCell.features.length);

    // Verify identical feature IDs
    const idsCoords = fcCoords.features.map((f) => f.id).sort();
    const idsCell = fcCell.features.map((f) => f.id).sort();
    expect(idsCoords).toEqual(idsCell);

    // Verify monitoring parity
    const monByCell = await monitorLandscape({
      locationSpecifier: { s2CellId },
    });
    const fcMon = parseLandscapeGeoJson(monByCell.monitoredLandscape.geojson);
    expect(fcMon.features.length).toBe(fcCell.features.length);
  });
});
