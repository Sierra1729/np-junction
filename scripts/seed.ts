import { PrismaClient } from "@prisma/client";
import { generateDemoFeatures } from "../src/lib/agri-api/mock";
import { DEFAULT_THRESHOLDS } from "../src/lib/scoring";
import { DEFAULT_CROP_CONFIGS } from "../src/lib/harvest/estimator";
import { DEFAULT_UNIT_CONFIG } from "../src/lib/units";

const prisma = new PrismaClient();

const DEMO_VILLAGES = [
  "Ranjangaon",
  "Shirur",
  "Khed",
  "Baramati",
  "Daund",
  "Junnar",
];

const FIRST_NAMES = [
  "Ramesh", "Suresh", "Ganesh", "Pandurang", "Santosh", "Tukaram", "Namdeo",
  "Ananda", "Balasaheb", "Dattatray", "Eknath", "Kishor", "Madhukar", "Narayan",
  "Popat", "Rajendra", "Shankar", "Tanaji", "Uttam", "Vasant", "Yuvraj",
  "Sunita", "Savita", "Rekha", "Shobha", "Usha", "Mangal", "Lata", "Anita",
  "Jyoti", "Meena", "Pushpa", "Ranjana", "Sarita", "Kavita", "Sangeeta",
  "Vidya", "Asha", "Kamal", "Sharda",
];

const LAST_NAMES = [
  "Patil", "Jadhav", "Shinde", "Pawar", "Kadam", "Chavan", "Deshmukh",
  "Gaikwad", "More", "Bhosale", "Thorat", "Salunkhe", "Wagh", "Kale",
  "Gawade", "Bichukale", "Zagade", "Mane", "Shirke", "Raut",
];

async function main() {
  console.log("🌱 Starting KrishiSatya seed script...");

  // 1. Clear existing database
  await prisma.auditLog.deleteMany();
  await prisma.fieldVisit.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.lotField.deleteMany();
  await prisma.lotFarmer.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.seasonPrediction.deleteMany();
  await prisma.field.deleteMany();
  await prisma.farmer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.apiCache.deleteMany();

  // 2. Seed Default Settings
  const defaultSettingsData = {
    thresholds: DEFAULT_THRESHOLDS,
    unitConfig: DEFAULT_UNIT_CONFIG,
    cropYieldConfigs: DEFAULT_CROP_CONFIGS,
    apiConcurrency: 3,
    cacheTtlHours: 24,
    fpoName: "Sahyadri Agro Farmers Producer Co. Ltd.",
    district: "Pune, Maharashtra",
  };

  await prisma.settings.create({
    data: {
      id: 1,
      data: JSON.stringify(defaultSettingsData),
    },
  });
  console.log("✅ Seeded Settings");

  // 3. Seed Users
  await prisma.user.createMany({
    data: [
      {
        email: "admin@krishisatya.org",
        name: "Vikram Deshmukh (FPO Admin)",
        role: "FPO_ADMIN",
        password: "demo",
      },
      {
        email: "officer@krishisatya.org",
        name: "Pooja Patil (Field Officer)",
        role: "FIELD_OFFICER",
        password: "demo",
      },
    ],
  });
  console.log("✅ Seeded Users (FPO_ADMIN & FIELD_OFFICER)");

  // 4. Generate mock features
  const demoCollection = generateDemoFeatures();
  const fieldFeatures = demoCollection.features.filter(
    (f) => f.properties.alu_type === "field"
  );

  console.log(`📡 Preparing to seed ${fieldFeatures.length} fields & 40 farmers...`);

  const createdFarmers = [];

  // Seed 40 Farmers
  for (let i = 0; i < 40; i++) {
    const fName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lName = LAST_NAMES[i % LAST_NAMES.length];
    const village = DEMO_VILLAGES[i % DEMO_VILLAGES.length];
    const organicStatus =
      i % 4 === 0
        ? "NPOP"
        : i % 4 === 1
        ? "PGS_INDIA"
        : i % 4 === 2
        ? "IN_CONVERSION"
        : "NONE";

    const farmer = await prisma.farmer.create({
      data: {
        farmerCode: `FPO-MH-2026-${String(i + 1).padStart(3, "0")}`,
        name: `${fName} ${lName}`,
        village,
        phone: `+91 98${(20000000 + i * 13579).toString().slice(0, 8)}`,
        consentExactBoundary: i % 2 === 0, // 50% consent
        organicStatus,
      },
    });
    createdFarmers.push(farmer);
  }

  // Seed Fields and assign to Farmers
  for (let i = 0; i < fieldFeatures.length; i++) {
    const feat = fieldFeatures[i];
    const farmer = createdFarmers[i % createdFarmers.length];

    const createdField = await prisma.field.create({
      data: {
        plusCodeId: feat.id,
        s2CellId: "4316826463333515264",
        geometry: JSON.stringify(feat.geometry),
        areaSqM: feat.properties.area_sq_m,
        aluConfidence: feat.properties.class_confidence,
        captureTimestamp: new Date(feat.properties.capture_timestamp_sec! * 1000),
        farmerId: farmer.id,
      },
    });

    // Seed SeasonPredictions
    if (feat.properties.monitoring_prediction) {
      for (const pred of feat.properties.monitoring_prediction) {
        await prisma.seasonPrediction.create({
          data: {
            fieldId: createdField.plusCodeId,
            startTs: new Date(pred.start_timestamp_sec * 1000),
            endTs: new Date(pred.end_timestamp_sec * 1000),
            crop1: pred.crop_1,
            conf1: pred.conf_1,
            crop2: pred.crop_2,
            conf2: pred.conf_2,
            crop3: pred.crop_3,
            conf3: pred.conf_3,
            dataVersion: "2026.09.1",
          },
        });
      }
    }
  }
  console.log(`✅ Seeded ${fieldFeatures.length} Fields & SeasonPredictions`);

  // 5. Seed Claims representing all UI states
  // Scenario 1: 10 Verified claims
  // Scenario 2: 8 Area mismatch/partial claims
  // Scenario 3: 6 Crop mismatch claims
  // Scenario 4: 4 UNKNOWN_CROP claims
  // Scenario 5: 4 NO_PREDICTION / fallow claims
  // Scenario 6: 4 Unsupported crops (Tomato, Mango, Onion)
  // Scenario 7: 4 Multi-plot claims

  const claimScenarios = [
    // 0..9: Verified
    ...Array.from({ length: 10 }).map((_, idx) => ({
      farmerIdx: idx,
      fieldIdx: idx,
      claimedCrop: "Rice",
      status: "VERIFIED",
      areaOffsetPct: 0.02, // 2% off
      reason: "Measured area aligns with claim (2% deviation). Satellite observations strongly confirm Rice cultivation.",
    })),
    // 10..17: Area Partial / Mismatch
    ...Array.from({ length: 8 }).map((_, idx) => ({
      farmerIdx: 10 + idx,
      fieldIdx: 10 + idx,
      claimedCrop: "Cotton",
      status: idx < 4 ? "NEEDS_VISIT" : "MISMATCH",
      areaOffsetPct: idx < 4 ? 0.18 : 0.35, // 18% or 35% off
      reason:
        idx < 4
          ? "Minor area variance observed (18% deviation). Requires field officer cross-check."
          : "Significant area variance detected (35% deviation between satellite perimeter and farmer claim).",
    })),
    // 18..23: Crop Mismatch
    ...Array.from({ length: 6 }).map((_, idx) => ({
      farmerIdx: 18 + idx,
      fieldIdx: 18 + idx,
      claimedCrop: "Wheat", // Satellite detected Soybeans
      status: "MISMATCH",
      areaOffsetPct: 0.03,
      reason: "Discrepancy detected: Farmer claimed Wheat, whereas satellite models detected Soybeans (91% confidence).",
    })),
    // 24..27: UNKNOWN_CROP
    ...Array.from({ length: 4 }).map((_, idx) => ({
      farmerIdx: 24 + idx,
      fieldIdx: 24 + idx,
      claimedCrop: "Sorghum",
      status: "NEEDS_VISIT",
      areaOffsetPct: 0.04,
      reason: "Active crop cultivation was confirmed by satellite vegetation indices, but the specific crop type could not be classified (UNKNOWN_CROP).",
    })),
    // 28..31: NO_PREDICTION / Fallow
    ...Array.from({ length: 4 }).map((_, idx) => ({
      farmerIdx: 28 + idx,
      fieldIdx: 28 + idx,
      claimedCrop: "Corn",
      status: "NEEDS_VISIT",
      areaOffsetPct: 0.01,
      reason: "Satellite imagery detected no active cultivation signature or imagery was obscured by cloud cover.",
    })),
    // 32..35: Unsupported Crop (Tomato, Onion)
    ...Array.from({ length: 4 }).map((_, idx) => ({
      farmerIdx: 32 + idx,
      fieldIdx: 32 + idx,
      claimedCrop: idx % 2 === 0 ? "Tomato" : "Onion",
      status: "NEEDS_VISIT",
      areaOffsetPct: 0.05,
      reason: `Specialty crop not directly modeled by AMED satellite classifications. Area is verified; requires onsite confirmation.`,
    })),
    // 36..39: Multi-plot
    ...Array.from({ length: 4 }).map((_, idx) => ({
      farmerIdx: 36 + idx,
      fieldIdx: 36,
      claimedCrop: "Rice",
      status: "VERIFIED",
      areaOffsetPct: 0.03,
      reason: "Multi-plot claim: 2 contiguous agricultural plots successfully verified.",
    })),
  ];

  for (let i = 0; i < claimScenarios.length; i++) {
    const sc = claimScenarios[i];
    const farmer = createdFarmers[sc.farmerIdx];
    const feat = fieldFeatures[sc.fieldIdx % fieldFeatures.length];

    const actualAreaSqM = feat.properties.area_sq_m;
    const claimedAreaSqM = actualAreaSqM * (1 + sc.areaOffsetPct);
    const claimedAreaAcres = Number((claimedAreaSqM / 4046.86).toFixed(2));

    const scores = {
      overallStatus: sc.status,
      overallScore: sc.status === "VERIFIED" ? 88 : sc.status === "NEEDS_VISIT" ? 64 : 35,
      areaDeviationPct: Number((sc.areaOffsetPct * 100).toFixed(1)),
      claimedAreaSqM,
      measuredAreaSqM: actualAreaSqM,
    };

    const claim = await prisma.claim.create({
      data: {
        farmerId: farmer.id,
        claimedCrop: sc.claimedCrop,
        claimedArea: claimedAreaAcres,
        unit: "acre",
        season: "Kharif",
        year: 2026,
        locationJson: JSON.stringify(feat.geometry),
        status: sc.status,
        scores: JSON.stringify(scores),
        reasons: JSON.stringify([sc.reason]),
        createdBy: "SYSTEM_SEED",
      },
    });

    // Seed FieldVisit for some claims
    if (i % 3 === 0) {
      await prisma.fieldVisit.create({
        data: {
          claimId: claim.id,
          officerId: "officer@krishisatya.org",
          outcome: sc.status === "VERIFIED" ? "CONFIRMED" : "CORRECTED",
          note: `Field officer visit completed. Boundaries surveyed with GPS coordinates. Crop stand confirmed in good health.`,
          lat: 18.624 + (i * 0.0005),
          lng: 73.076 + (i * 0.0004),
        },
      });
    }

    // Seed AuditLog
    await prisma.auditLog.create({
      data: {
        entity: "Claim",
        entityId: claim.id,
        action: "CREATE",
        userId: "admin@krishisatya.org",
        claimId: claim.id,
        after: JSON.stringify({ status: sc.status, claimedCrop: sc.claimedCrop }),
      },
    });
  }
  console.log(`✅ Seeded ${claimScenarios.length} Claims with field visits and audit trails`);

  // 6. Seed Produce Lots for Organic Traceability
  const lots = [
    {
      lotCode: "LOT-2026-RICE-001",
      crop: "Rice",
      quantityKg: 12500,
      harvestDate: new Date("2026-10-25"),
      certificationType: "NPOP",
      fieldIndices: [0, 1, 2],
    },
    {
      lotCode: "LOT-2026-SOY-002",
      crop: "Soybeans",
      quantityKg: 8400,
      harvestDate: new Date("2026-09-22"),
      certificationType: "PGS_INDIA",
      fieldIndices: [3, 4],
    },
    {
      lotCode: "LOT-2026-COTTON-003",
      crop: "Cotton",
      quantityKg: 6200,
      harvestDate: new Date("2026-11-30"),
      certificationType: "IN_CONVERSION",
      fieldIndices: [5, 6],
    },
  ];

  for (const l of lots) {
    const lot = await prisma.lot.create({
      data: {
        lotCode: l.lotCode,
        crop: l.crop,
        quantityKg: l.quantityKg,
        harvestDate: l.harvestDate,
        certificationType: l.certificationType,
        certificateUrl: "https://apeda.gov.in/apedawebsite/organic/organic_products.htm",
      },
    });

    for (const fIdx of l.fieldIndices) {
      const feat = fieldFeatures[fIdx];
      const farmer = createdFarmers[fIdx % createdFarmers.length];

      await prisma.lotField.create({
        data: {
          lotCode: lot.lotCode,
          plusCodeId: feat.id,
        },
      });

      await prisma.lotFarmer.upsert({
        where: {
          lotCode_farmerId: {
            lotCode: lot.lotCode,
            farmerId: farmer.id,
          },
        },
        create: {
          lotCode: lot.lotCode,
          farmerId: farmer.id,
        },
        update: {},
      });
    }
  }
  console.log(`✅ Seeded ${lots.length} Organic Traceability Produce Lots`);

  console.log("🌾 KrishiSatya database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
