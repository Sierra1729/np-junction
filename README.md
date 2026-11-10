# KrishiSatya (कृषि सत्य) — Satellite-Verified Farm Intelligence Platform

KrishiSatya is an AI-powered agricultural intelligence platform built on **Google's Agricultural Understanding API** (incorporating DeepMind's **ALU** — Agricultural Landscape Understanding and **AMED** — Agricultural Monitoring & Event Detection models).

It unifies three mission-critical workflows:
1. **Claim Verification:** Cross-references farmer claims (acreage, crop) against satellite detections over a 3- to 6-year historical timeline to generate explainable, auditable verification reports for banks, insurers, FPOs, and government schemes.
2. **FPO Regional Dashboard:** Maps member cadastres, tracks current-season crop mix, projects harvest volume and dates, and generates privacy-compliant, buyer-facing supply sheets for commercial negotiations.
3. **Organic Produce Traceability:** Issues cryptographic QR codes for produce lots that allow buyers to audit the multi-year satellite parcel history of the exact source plots without leaking farmer personal data.

---

## Core Philosophy: AI Assists, Humans Decide

The platform strictly adheres to the principle that AI models provide decision support rather than automated punitive decisions. Mismatches never result in automatic rejection or accusatory labels like "fraud"; they are designated as **"Needs Field Visit"**, allowing Field Officers to conduct on-site GPS ground truthing and record human determinations.

---

## Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v20/v24)
- npm 9+

### 1. Installation
```bash
cd krishisatya
npm install --legacy-peer-deps
```

### 2. Environment Configuration
Create `.env.local` based on `.env.example`:
```bash
cp .env.example .env.local
```

Key environment variables:
| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLite database connection string | `file:./dev.db` |
| `AGRI_UNDERSTANDING_API_KEY` | Google Agricultural Understanding API Key (**Never commit**) | `""` |
| `AGRI_DATA_MODE` | `mock` (offline realistic fixtures) or `live` | `mock` |
| `AGRI_API_CONCURRENCY` | Maximum concurrent outgoing requests to Google Cloud | `3` |
| `AGRI_CACHE_TTL_HOURS` | Cache time-to-live for satellite responses | `24` |
| `NEXTAUTH_URL` | Root URL of deployment | `http://localhost:3000` |

### 3. Database Migration & Realistic Seeding
Run the seed script to populate default settings, user accounts (FPO Admin & Field Officer), 40 farmers around Google's benchmark location (lat `18.624`, lng `73.076`), multi-season predictions, verification claims, ground inspections, and organic lots:
```bash
npm run seed
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Running the Automated Test Suite
```bash
npm run test
```
Executes all unit tests covering GeoJSON string parsing, S2 level-13 cell generation, unit conversions, scoring rules edge cases, harvest volume calculations, and live-mock mode parity.

---

## How to Get Google Agricultural Understanding API Access

1. **Allowlisting Request:** The Google Agricultural Understanding API is currently in restricted preview. Contact your Google Cloud or Google DeepMind representative to get your Google Cloud Project allowlisted for the service `agriculturalunderstanding.googleapis.com`.
2. **Enable the API:** In Google Cloud Console, navigate to **APIs & Services > Library**, search for **Agricultural Understanding API**, and click **Enable**.
3. **Create Restricted API Key:** Under **APIs & Services > Credentials**, create a new API Key. Restrict the key to only call `Agricultural Understanding API` to prevent unauthorized usage.
4. **Configure Local Environment:** Place the key in `.env.local` as `AGRI_UNDERSTANDING_API_KEY=your_key_here` and set `AGRI_DATA_MODE=live`.

---

## API Architecture & Official Spec Conformity

### Endpoints Implemented
- `POST /v1:lookupLandscape` (ALU): Retrieves agricultural field parcels, tree clumps, dug wells, and farm ponds.
- `POST /v1:lookupLandscapeCaptureDate` (ALU): Lists historical satellite acquisition timestamps.
- `POST /v1:monitorLandscape` (AMED): Retrieves multi-season crop classifications, sowing/harvest bounds, and model confidence scores.

### Divergence & API Nuances Documented
1. **Stringified GeoJSON Response:** The API returns the spatial payload under `response.landscape.geojson` or `response.monitoredLandscape.geojson` as an **escaped JSON string**. The app cleanly parses this into typed RFC 7946 GeoJSON FeatureCollections.
2. **Spatial Granularity:** Queries are dispatched by coordinate or **Level-13 S2 Cell ID** (~1 km × 1 km). Centroid indexing means fields near edges can reside in neighboring S2 cells; the app automatically performs edge-neighbor expansion within a 30m buffer.
3. **MultiPolygon Geometries:** The platform supports both GeoJSON `Polygon` and `MultiPolygon` geometries.
4. **Supported Crops:** `Bajra`, `Chilli`, `Corn`, `Cotton`, `Gram`, `Groundnut`, `Mustard`, `Rice`, `Sorghum`, `Soybeans`, `Sugarcane`, `Wheat`. Unlisted specialty crops are categorized as **"Not verifiable by satellite"**, triggering verification of area and cultivation while deferring variety confirmation to field visits.

---

## Scoring Rules & Decision Logic

### 1. Area Check
Calculates $\text{deviation} = \frac{|\text{measured} - \text{claimed}|}{\text{claimed}} \times 100$:
- $\le 10\%$: **Match**
- $10\% - 25\%$: **Partial Match** (flags for human field verification)
- $> 25\%$: **Mismatch**

### 2. Crop Check
Evaluates AMED predictions for the claimed season window:
- Claimed crop matches `crop_1` with $\text{confidence} > 0.70$: **Strong Match**
- Claimed crop matches `crop_1` or `crop_2` with $\text{confidence} \ge 0.50$: **Probable Match**
- `UNKNOWN_CROP` or unsupported crop: **Not Verifiable by Satellite** (standing crop confirmed, species requires field visit)
- `NO_PREDICTION`: **No Cultivation Detected** (fallow or cloud cover)
- Otherwise: **Mismatch**

### 3. Historical Cultivation Consistency (0–100)
Evaluates recent seasons over a configurable 3- to 6-year window:
$$\text{Consistency} = \frac{\text{cultivated seasons}}{\text{total observed seasons}} \times 100$$
Flags long fallow gaps ($\ge 3$ consecutive seasons). Scores $\ge 60\%$ are considered consistent.

### 4. Boundary Clarity Tier
- ALU `class_confidence` $> 0.90$: **High Clarity**
- $0.75 - 0.90$: **Medium Clarity**
- $< 0.75$: **Low Clarity** (adds note: "Survey boundary on site with GPS")

### 5. Composite Determination
- **Verified:** Area Match + Crop Strong/Probable Match + Consistency $\ge 60\%$ + Clean boundary.
- **Needs Field Visit:** Any Partial Match, Low Boundary Confidence, or Not Verifiable Crop.
- **Mismatch:** Area or Crop Mismatch.

---

## Security & Privacy Highlights
- **Server-Side Proxy:** API keys are never exposed to browser bundles. All requests route through server handlers with DB caching and concurrency rate limiting.
- **Privacy Masking:** The public `/trace/[lotCode]` page respects farmer consent: only farmers granting explicit consent have exact plot polygons rendered. For others, an approximate 1 km buffer is displayed, and only first names are published.
- **Commercial Supply Sheet:** Aggregates volumes and availability windows for institutional buyers with zero personal farmer data.
