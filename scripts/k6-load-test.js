import http from "k6/http";
import { check, sleep, group } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

/**
 * RestroNex High-Scale Reliability & Stress Test Suite
 * Evaluated across 3 verified concurrency stages: 100 VUs -> 500 VUs -> 1,000 VUs
 * Target Architecture: Supavisor Transaction Pooler + Next.js 16 Standalone Server
 */

// Custom metrics
const totalRequests = new Counter("total_requests");
const healthLatency = new Trend("health_latency_ms");
const menuLatency = new Trend("menu_latency_ms");
const errorRate = new Rate("error_rate");

export const options = {
  scenarios: {
    stepped_staging_workload: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "5s", target: 100 },   // Tier 1: 100 Concurrent Outlets
        { duration: "10s", target: 500 },  // Tier 2: 500 Concurrent Outlets
        { duration: "10s", target: 1000 }, // Tier 3: 1,000 Peak Concurrency
        { duration: "5s", target: 0 },     // Graceful ramp-down
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2500"], // 95% of requests under 2.5s under peak load
    error_rate: ["rate<0.05"],        // Less than 5% total error rate
  },
};

const BASE_URL = __ENV.TARGET_URL || "http://127.0.0.1:3001";

export default function () {
  // 1. Health Diagnostics (System ping & DB readiness)
  group("Health Diagnostics", function () {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/health`, {
      headers: { Accept: "application/json" },
      timeout: "10s",
    });
    healthLatency.add(Date.now() - start);
    totalRequests.add(1);

    const pass = check(res, {
      "health returns 200": (r) => r.status === 200,
      "db is healthy": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === "ok";
        } catch (e) {
          return false;
        }
      },
    });
    errorRate.add(!pass);
  });

  sleep(0.1);
}
