import {
  CaptureDate,
  LookupLandscapeCaptureDateResponse,
  LookupLandscapeRequest,
  LookupLandscapeResponse,
  MonitorLandscapeRequest,
  MonitorLandscapeResponse,
} from "./types";
import { agriApiLimiter } from "./rate-limiter";
import {
  getMockCaptureDates,
  getMockLookupResponse,
  getMockMonitorResponse,
} from "./mock";
import { s2CellIdToCenterLatLng } from "../geo/s2";

const BASE_URL = "https://agriculturalunderstanding.googleapis.com";

export class AgriApiError extends Error {
  statusCode: number;
  isNoCoverage: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AgriApiError";
    this.statusCode = statusCode;
    this.isNoCoverage = statusCode === 404;
  }
}

/**
 * Checks if running in Mock mode
 */
export function isMockMode(): boolean {
  const mode = process.env.AGRI_DATA_MODE || "mock";
  const apiKey = process.env.AGRI_UNDERSTANDING_API_KEY;
  // If explicitly mock, or if no API key is provided, use mock mode safely
  return mode.toLowerCase() === "mock" || !apiKey || apiKey.trim() === "";
}

/**
 * Executes a POST request to Google Agricultural Understanding API with retries for 500 errors.
 */
async function postWithRetry<T>(endpoint: string, body: unknown): Promise<T> {
  const apiKey = process.env.AGRI_UNDERSTANDING_API_KEY;
  if (!apiKey) {
    throw new AgriApiError("Google Agricultural Understanding API key is not configured.", 401);
  }

  const url = `${BASE_URL}${endpoint}?key=${encodeURIComponent(apiKey)}`;

  let attempts = 0;
  const maxRetries = 3;
  let delayMs = 1000;

  while (attempts < maxRetries) {
    attempts++;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      const status = response.status;
      const errorText = await response.text();

      if (status === 404) {
        throw new AgriApiError(
          "No satellite farm data available for this location (non-agricultural or urban area).",
          404
        );
      }

      if (status === 401 || status === 403) {
        throw new AgriApiError(
          "Authentication failed: Invalid API key or missing Agricultural Understanding permissions.",
          status
        );
      }

      if (status === 400) {
        throw new AgriApiError(
          `Bad request: ${errorText || "Invalid S2 cell level or coordinates format."}`,
          400
        );
      }

      // If 5xx and we have retries left, wait and retry
      if (status >= 500 && attempts < maxRetries) {
        console.warn(`[AgriAPI] Received status ${status}, retrying in ${delayMs}ms (attempt ${attempts}/${maxRetries})...`);
        await new Promise((res) => setTimeout(res, delayMs));
        delayMs *= 2;
        continue;
      }

      throw new AgriApiError(`API returned error ${status}: ${errorText}`, status);
    } catch (err: unknown) {
      if (err instanceof AgriApiError) {
        throw err;
      }
      if (attempts >= maxRetries) {
        throw new AgriApiError(`Network failure communicating with Google Agri API: ${(err as Error).message}`, 500);
      }
      await new Promise((res) => setTimeout(res, delayMs));
      delayMs *= 2;
    }
  }

  throw new AgriApiError("Request failed after maximum retries.", 500);
}

/**
 * 1. POST /v1:lookupLandscape (ALU)
 */
export async function lookupLandscape(
  request: LookupLandscapeRequest,
  centerCoords?: { latitude: number; longitude: number }
): Promise<LookupLandscapeResponse> {
  const s2CellId = request.locationSpecifier.s2CellId || "default";
  const coords =
    centerCoords ||
    request.locationSpecifier.coordinates ||
    (s2CellId && s2CellId !== "default" ? s2CellIdToCenterLatLng(s2CellId) : undefined);

  if (isMockMode()) {
    return getMockLookupResponse(s2CellId, coords);
  }

  return agriApiLimiter(() => postWithRetry<LookupLandscapeResponse>("/v1:lookupLandscape", request));
}

/**
 * 2. POST /v1:monitorLandscape (AMED)
 */
export async function monitorLandscape(
  request: MonitorLandscapeRequest,
  centerCoords?: { latitude: number; longitude: number }
): Promise<MonitorLandscapeResponse> {
  const s2CellId = request.locationSpecifier.s2CellId || "default";
  const coords =
    centerCoords ||
    request.locationSpecifier.coordinates ||
    (s2CellId && s2CellId !== "default" ? s2CellIdToCenterLatLng(s2CellId) : undefined);

  if (isMockMode()) {
    return getMockMonitorResponse(s2CellId, coords);
  }

  return agriApiLimiter(() => postWithRetry<MonitorLandscapeResponse>("/v1:monitorLandscape", request));
}

/**
 * 3. POST /v1:lookupLandscapeCaptureDate (ALU)
 */
export async function lookupLandscapeCaptureDate(
  locationSpecifier: MonitorLandscapeRequest["locationSpecifier"],
  centerCoords?: { latitude: number; longitude: number }
): Promise<CaptureDate[]> {
  const s2CellId = locationSpecifier.s2CellId || "default";
  const coords =
    centerCoords ||
    locationSpecifier.coordinates ||
    (s2CellId && s2CellId !== "default" ? s2CellIdToCenterLatLng(s2CellId) : undefined);

  if (isMockMode()) {
    return getMockCaptureDates(coords).captureDates;
  }

  const res = await agriApiLimiter(() =>
    postWithRetry<LookupLandscapeCaptureDateResponse>("/v1:lookupLandscapeCaptureDate", {
      locationSpecifier,
    })
  );

  return res.captureDates || [];
}
