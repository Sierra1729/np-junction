import puppeteer from "puppeteer";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\pawan\\.gemini\\antigravity\\brain\\cadc5386-6a85-4b4f-8096-a80649f35a6f";
const BASE_URL = "http://localhost:3000";

async function run() {
  console.log("📸 Launching headless browser for KrishiSatya Walkthrough screenshots...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const routes = [
    { name: "01_dashboard.png", url: `${BASE_URL}/dashboard`, wait: 3000 },
    { name: "02_verify_claim.png", url: `${BASE_URL}/verify`, wait: 3000 },
    { name: "03_claim_report.png", url: `${BASE_URL}/verify/cmvcm97ac0089lkbgsgfi28up`, wait: 3000 },
    { name: "04_field_visit.png", url: `${BASE_URL}/verify/cmvcm97ac0089lkbgsgfi28up/visit`, wait: 2000 },
    { name: "05_members.png", url: `${BASE_URL}/members`, wait: 2000 },
    { name: "06_harvest_planner.png", url: `${BASE_URL}/harvest`, wait: 2500 },
    { name: "07_lots.png", url: `${BASE_URL}/lots`, wait: 2000 },
    { name: "08_settings.png", url: `${BASE_URL}/settings`, wait: 2000 },
  ];

  for (const r of routes) {
    console.log(`Capturing ${r.name} from ${r.url}...`);
    await page.goto(r.url, { waitUntil: "networkidle2" });
    await new Promise((res) => setTimeout(res, r.wait));
    const dest = path.join(ARTIFACT_DIR, r.name);
    await page.screenshot({ path: dest, fullPage: false });
    console.log(`Saved: ${dest}`);
  }

  // Mobile viewport for Public Trace Page
  console.log("Capturing 09_trace_public_mobile.png with mobile viewport (390x844)...");
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`${BASE_URL}/trace/LOT-2026-RICE-001`, { waitUntil: "networkidle2" });
  await new Promise((res) => setTimeout(res, 3000));
  const mobileDest = path.join(ARTIFACT_DIR, "09_trace_public_mobile.png");
  await page.screenshot({ path: mobileDest, fullPage: true });
  console.log(`Saved: ${mobileDest}`);

  await browser.close();
  console.log("✨ All walkthrough screenshots captured successfully!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
