# KrishiSatya (कृषि सत्य) — Satellite-Verified Farm Intelligence Platform

> **Empowering Farmers, FPOs, Banks, and Agribusinesses with Explainable Satellite Intelligence.**  
> Built on Google's **Agricultural Understanding API** (incorporating DeepMind's **ALU** — Agricultural Landscape Understanding and **AMED** — Agricultural Monitoring & Event Detection models).

---

## 🌾 1. What the Project Does

In smallholder agricultural economies (such as India), financial institutions, crop insurers, Farmer Producer Organizations (FPOs), and agricultural buyers struggle with information asymmetry:
- **Banks & Insurers:** Suffer from unverified acreage claims, crop misrepresentation, and slow manual field surveys, delaying loan disbursement and claim settlement.
- **FPOs (Farmer Producer Organizations):** Lack real-time regional visibility into member farm parcels, harvest timings, and aggregated crop volumes needed to negotiate favorable forward contracts.
- **Consumers & Buyers:** Have no transparent, tamper-proof proof that produce labeled "organic" actually originates from farms practicing continuous multi-year crop cultivation without prohibited chemical interventions.

**KrishiSatya unifies four mission-critical workflows into a single explainable platform:**

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │                       KRISHISATYA PLATFORM                             │
   ├───────────────────┬───────────────────┬────────────────────────────────┤
   │ 1. Claim          │ 2. FPO Regional   │ 3. Organic Produce             │
   │    Verification   │    Dashboard      │    Traceability (QR)           │
   │ ───────────────── │ ───────────────── │ ────────────────────────────── │
   │ • Satellite Area  │ • Member Cadastre │ • Consumer QR Code Audit       │
   │ • Crop Validation │ • Harvest Windows │ • 3-6 Yr Parcel Crop History   │
   │ • 3-6 Yr History  │ • Yield Forecast  │ • Zero-PII Privacy Protection  │
   ├───────────────────┴───────────────────┴────────────────────────────────┤
   │ 4. Field Officer Ground Truthing & Audit ("AI Assists, Humans Decide")  │
   └────────────────────────────────────────────────────────────────────────┘
```

### Core Capabilities:
1. **Automated Claim Verification:**
   Cross-references farmer claims (acreage and crop type) against high-resolution satellite segmentations over a 3- to 6-year historical timeline. It generates auditable verification reports with mathematically transparent confidence scores.
2. **FPO Regional Intelligence Dashboard:**
   Maps member cadastres across administrative blocks, monitors current-season crop mixes (e.g., Soybeans, Cotton, Sugarcane, Wheat), forecasts harvest dates and yield tonnage, and generates privacy-compliant, buyer-facing supply sheets.
3. **Consumer-Grade Organic Traceability:**
   Generates cryptographic, scannable QR codes affixed to produce lots. When scanned by a consumer or wholesale buyer, it serves a responsive mobile page showing the multi-year satellite parcel history of the exact source plots without exposing the farmer's personal identification.
4. **Human-in-the-Loop Ground Inspection:**
   The platform adheres to the core philosophy that **AI assists, humans decide**. Mismatches never trigger automated disqualification or accusations of fraud. They are classified as `"Needs Field Visit"`, routing a mobile-optimized GPS inspection form to local field officers to conduct on-site ground truthing.

---

## ⚙️ 2. How the Project Does It (Architecture & Mechanics)

```
[ Google Sentinel-2 / Landsat Imagery ]
                   │
                   ▼
[ Google Agricultural Understanding API (DeepMind) ]
    ├── ALU (Landscape Lookup): Field boundaries, tree clumps, farm ponds
    └── AMED (Event Detection): Sowing/harvest dates, crop classification
                   │ (Escaped GeoJSON + S2 Cell Indexing)
                   ▼
┌────────────────────────────────────────────────────────┐
│               KRISHISATYA BACKEND SERVICE              │
│                                                        │
│  1. Spatial Parser: Escaped GeoJSON -> RFC 7946        │
│  2. S2 Spatial Grid: Level-13 Cell (~1km²) Indexing    │
│  3. Boundary Matcher: 30m Buffer Intersection (Turf)   │
│  4. Deterministic Scoring Engine                       │
│     ├── Area Deviation Calculation (<=10%, <=25%, >25%)│
│     ├── Crop Probability Matching (Confidence > 0.70)  │
│     ├── Multi-Year Cultivation Consistency (3-6 yrs)   │
│     └── Boundary Sharpness Tiering                     │
│  5. Prisma ORM: Multi-Season Parcel & Claim Storage    │
└────────────────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│                   FRONTEND & APIS                      │
│  • Next.js 16 (App Router + Server Components)         │
│  • React 19 + Tailwind CSS v4                          │
│  • Interactive Leaflet Maps (Cadastral Boundaries)     │
│  • Firebase Hosting + Cloud Functions (SSR)            │
└────────────────────────────────────────────────────────┘
```

### A. DeepMind ALU & AMED Model Integration
- **ALU (`/v1:lookupLandscape`):** Employs deep panoptic segmentation to detect parcel boundaries, water bodies, and agroforestry canopies down to smallholder field sizes.
- **AMED (`/v1:monitorLandscape`):** Tracks vegetation phenology and multi-spectral temporal profiles across seasons to classify 12 primary crops (`Bajra`, `Chilli`, `Corn`, `Cotton`, `Gram`, `Groundnut`, `Mustard`, `Rice`, `Sorghum`, `Soybeans`, `Sugarcane`, `Wheat`) and pinpoint sowing and harvest dates.

### B. S2 Spatial Indexing & Boundary Buffer Math
- Satellite detections are referenced to **Google S2 Level-13 cells** ($\approx 1\text{ km} \times 1\text{ km}$).
- Centroid indexing means field boundaries frequently traverse cell edges. KrishiSatya uses `nodes2ts` and `@turf/turf` to query adjacent cell neighbors with a **30-meter buffer expansion**, guaranteeing that boundary-overlapping parcels are never truncated or lost.

### C. Deterministic Scoring Engine (`src/lib/scoring/index.ts`)
The platform computes four orthogonal verification signals:

1. **Area Check:**
   $$\text{Deviation } (\%) = \frac{|\text{Measured Area} - \text{Claimed Area}|}{\text{Claimed Area}} \times 100$$
   - $\le 10\%$: **Match**
   - $10\% - 25\%$: **Partial Match** (flags for human field verification)
   - $> 25\%$: **Mismatch**

2. **Crop Check:**
   Evaluates AMED predictions for the claimed season window:
   - Primary crop matches with confidence $> 0.70$: **Strong Match**
   - Secondary candidate matches with confidence $\ge 0.50$: **Probable Match**
   - Unsupported specialty crop: **Not Verifiable by Satellite** (standing crop confirmed, species deferred to field survey)
   - `NO_PREDICTION`: **No Cultivation Detected** (fallow or cloud cover)

3. **Multi-Year Cultivation Consistency Index (0–100):**
   $$\text{Consistency} = \frac{\text{Cultivated Seasons}}{\text{Total Observed Seasons (3–6 Years)}} \times 100$$
   Flags long fallow gaps ($\ge 3$ consecutive seasons). Scores $\ge 60\%$ are considered consistent.

4. **Boundary Clarity Tier:**
   - ALU confidence $> 0.90$: **High Clarity**
   - $0.75 - 0.90$: **Medium Clarity**
   - $< 0.75$: **Low Clarity** (triggers on-site GPS perimeter audit)

5. **Composite Determination:**
   $$\text{Final Status} = \begin{cases} 
   \textbf{Verified} & \text{if Area Match } \land \text{ Crop Match } \land \text{ Consistency } \ge 60\% \land \text{ High/Med Boundary} \\
   \textbf{Needs Field Visit} & \text{if Partial Match } \lor \text{ Low Boundary Confidence } \lor \text{ Specialty Crop} \\
   \textbf{Mismatch} & \text{if Area Mismatch } \lor \text{ Crop Mismatch}
   \end{cases}$$

### D. Privacy-Preserving Architecture
- **Zero-PII Consumer Tracing:** The public QR route (`/trace/[lotCode]`) verifies satellite authenticity without leaking sensitive cadastral ownership or farmer identity. If farmer consent is not granted, exact polygons are generalized into a 1 km approximate centroid.
- **Server-Side Proxy:** Google Agricultural Understanding API credentials never reach client bundles. Requests are cached in SQLite/PostgreSQL with rate limiting and concurrency throttling.

---

## 🤖 3. Connecting the Repository with Claude (Avoiding Storage Limits)

### Why Does Adding the Whole Repo Exceed Claude's Storage Limit?
When you connect a GitHub repository directly to Claude Projects, Claude has a context/file size limit (typically ~30 MB total project context or individual 10–25 MB file caps). 

In this repository, the primary culprits causing the limit error are:
1. **`2411.05359v2.pdf` (24.1 MB)** — ArXiv paper on Agricultural Landscape Understanding.
2. **`2507.02972v1.pdf` (5.2 MB)** — ArXiv research paper on satellite models.
3. **`package-lock.json` (415 KB / >10,000 lines)** — Large dependency tree.
4. **`public/data/kotli_arjun_singh_real_parcels.json`** — Large GeoJSON fixture.

Together, the two research PDFs consume **~29.3 MB**, instantly exhausting Claude's capacity before reading any source code.

---

### Solution 1: Use `.claudeignore` (Recommended for Full GitHub Sync)
Add a `.claudeignore` file to the root of the repository (already created for you). Claude's GitHub integration respects this file and will skip all bulky binaries:

```gitignore
# Exclude large research PDFs
*.pdf

# Exclude package lock files
package-lock.json
package-lock.*
yarn.lock
pnpm-lock.yaml

# Exclude large raw JSON datasets and images
public/data/
public/**/*.svg
public/**/*.ico

# Exclude test files if only reviewing app logic
tests/
```

With `.claudeignore` in place, the entire codebase syncs smoothly within Claude's limits!

---

### Solution 2: Minimal Curated File List to Attach to Claude

If you prefer uploading or attaching individual files directly to a Claude conversation or project, **attach only these 10 core files**. They contain 100% of the architecture, data models, scoring mathematics, and business logic:

| Priority | File Path | What It Explains to Claude |
|---|---|---|
| **1** | `README.md` | Complete project overview, architecture, scoring formulas, and specs |
| **2** | `prisma/schema.prisma` | Full database schema (Farmers, Parcels, Claims, Inspections, Lots) |
| **3** | `src/lib/scoring/index.ts` | The core satellite claim verification decision algorithm |
| **4** | `src/lib/agri-api/types.ts` | Complete TypeScript type definitions for Google ALU & AMED APIs |
| **5** | `src/lib/agri-api/client.ts` | Client for Google Agricultural Understanding API calls & caching |
| **6** | `src/lib/geo/turf-utils.ts` | Geospatial calculations, polygon intersections, and area formulas |
| **7** | `src/lib/geo/s2.ts` | Level-13 S2 spatial grid indexing and cell calculation |
| **8** | `src/lib/harvest/estimator.ts` | Yield forecasting and harvest date projection algorithms |
| **9** | `src/lib/seasons.ts` & `src/lib/units.ts` | Agricultural seasons (Kharif, Rabi, Zaid) and unit conversions (Acres, Hectares, Gunthas) |
| **10** | `package.json` | Project dependencies, scripts, and runtime engines |

*(Optional frontend context: If you want Claude to review UI components, attach `src/app/verify/page.tsx` and `src/app/dashboard/page.tsx`.)*

---

## 🚀 4. Local Development Quickstart

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Configure environment
cp .env.example .env.local

# 3. Seed database with realistic fixtures
npm run seed

# 4. Run development server
npm run dev

# 5. Run test suite
npm run test
```

---

## 🌐 5. Deployment

- **Firebase Project ID:** `np-junction`
- **Live URL:** [https://np-junction.web.app](https://np-junction.web.app)
- **CI/CD:** Configured via GitHub Actions to automatically build and deploy upon pushes to branch `main`.
