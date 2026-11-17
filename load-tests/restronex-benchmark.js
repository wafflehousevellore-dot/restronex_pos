import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// Custom Performance Metrics
const qrMenuDuration = new Trend("qr_menu_duration_ms");
const healthDuration = new Trend("health_duration_ms");
const orderPlacementDuration = new Trend("order_placement_duration_ms");
const marketingPageDuration = new Trend("marketing_page_duration_ms");
const errorRate = new Rate("error_rate");
const ordersCreated = new Counter("orders_placed_total");

// Environment configurations
const BASE_URL = __ENV.BASE_URL || "https://restronex.vercel.app";
const TARGET_VUS = parseInt(__ENV.VUS || "500", 10);
const DURATION = __ENV.DURATION || "20s";

export const options = {
  insecureSkipTLSVerify: true,
  noConnectionReuse: false,
  userAgent: "RestroNexLoadTester/1.0",
  batch: 20,
  batchPerHost: 20,
  scenarios: {
    high_traffic_concurrency: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "5s", target: Math.round(TARGET_VUS * 0.5) }, // Stage 1: Half load
        { duration: "5s", target: TARGET_VUS },                   // Stage 2: Target load
        { duration: DURATION, target: TARGET_VUS },               // Stage 3: Hold peak
        { duration: "5s", target: 0 },                            // Stage 4: Ramp down
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"], // Error rate < 5% under burst load
    http_req_duration: ["p(95)<3000"], // p95 < 3s
  },
};

const QR_TOKENS = [
  "qr_ny3u_t01_b29199d8",
  "qr_ny3u_t02_a6ec6d4b",
  "qr_ny3u_t03_0144f473",
  "qr_ny3u_t04_b2a684a3",
  "qr_ny3u_t05_7418d42b",
];

const MENU_ITEMS = [
  { id: "cmw4x4sfj000a4blqf3tstmpk", name: "Honey Butter Waffle" },
  { id: "cmw4x4skf000b4blq80tf2rs4", name: "Nutella Blast Waffle" },
  { id: "cmw4x4spb000c4blqnzuavo61", name: "Belgian Dark Chocolate Waffle" },
];

export default function runBenchmark() {
  const vuId = __VU;
  const iterId = __ITER;
  const roll = Math.random();
  const selectedToken = QR_TOKENS[vuId % QR_TOKENS.length];
  const selectedItem = MENU_ITEMS[vuId % MENU_ITEMS.length];

  // 1. Contactless QR Menu Scan (50% of traffic)
  if (roll < 0.50) {
    const res = http.get(`${BASE_URL}/api/qr/${selectedToken}`, {
      tags: { name: "GET /api/qr/[token]" },
      headers: { "Accept": "application/json" },
    });
    qrMenuDuration.add(res.timings.duration);
    const success = check(res, {
      "QR menu status is 200": (r) => r.status === 200,
      "Menu has categories": (r) => r.body && r.body.includes("categories"),
    });
    errorRate.add(!success);
  }
  // 2. Public Marketing & Pricing Pages (25% of traffic)
  else if (roll < 0.75) {
    const isPricing = Math.random() > 0.5;
    const url = isPricing ? `${BASE_URL}/pricing` : `${BASE_URL}/`;
    const res = http.get(url, {
      tags: { name: isPricing ? "GET /pricing" : "GET /" },
    });
    marketingPageDuration.add(res.timings.duration);
    const success = check(res, {
      "Page status is 200": (r) => r.status === 200,
    });
    errorRate.add(!success);
  }
  // 3. Health & Status Check (15% of traffic)
  else if (roll < 0.90) {
    const res = http.get(`${BASE_URL}/api/health`, {
      tags: { name: "GET /api/health" },
      headers: { "Accept": "application/json" },
    });
    healthDuration.add(res.timings.duration);
    const success = check(res, {
      "Health status is 200": (r) => r.status === 200,
      "DB is healthy": (r) => r.body && r.body.includes('"status":"healthy"'),
    });
    errorRate.add(!success);
  }
  // 4. Concurrent Order Placement with Idempotency (10% of traffic)
  else {
    const idempotencyKey = `idemp_${vuId}_${iterId}`;
    const payload = JSON.stringify({
      customerName: `Guest ${vuId}`,
      customerPhone: "+919876543210",
      notes: "Table seating order via k6",
      whatsappConsent: false,
      idempotencyKey,
      items: [
        {
          menuItemId: selectedItem.id,
          name: selectedItem.name,
          quantity: 1,
        },
      ],
    });

    const res = http.post(`${BASE_URL}/api/qr/${selectedToken}`, payload, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      tags: { name: "POST /api/qr/[token]" },
    });
    orderPlacementDuration.add(res.timings.duration);

    const success = check(res, {
      "Order created or replayed (200)": (r) => r.status === 200,
      "Response has orderNumber": (r) => r.body && r.body.includes("orderNumber"),
    });
    if (success) {
      ordersCreated.add(1);
    }
    errorRate.add(!success);
  }

  // Realistic customer pacing across dining tables (0.5s - 1.0s think time)
  sleep(0.5 + Math.random() * 0.5);
}
