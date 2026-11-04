import "dotenv/config";
import crypto from "crypto";
import { POST as createOrderHandler } from "../src/app/api/create-order/route";
import { POST as verifyPaymentHandler } from "../src/app/api/verify-payment/route";
import { NextRequest } from "next/server";

function createMockRequest(url: string, body: any): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function runTests() {
  console.log("==================================================");
  console.log("  Testing Razorpay Standard Integration Flow      ");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  // TEST 1: Reject order with amount < 100 paise
  try {
    const req = createMockRequest("http://localhost:3000/api/create-order", { amount: 50 });
    const res = await createOrderHandler(req);
    const data = await res.json();
    if (res.status === 400 && data.error.includes("Minimum amount is 100 paise")) {
      console.log("✓ Test 1 Passed: Amount < 100 paise rejected with HTTP 400");
      passed++;
    } else {
      console.error("✗ Test 1 Failed: Expected 400 with minimum amount error", data);
      failed++;
    }
  } catch (err) {
    console.error("✗ Test 1 Error:", err);
    failed++;
  }

  // TEST 2: Reject order with invalid amount
  try {
    const req = createMockRequest("http://localhost:3000/api/create-order", { amount: "invalid" });
    const res = await createOrderHandler(req);
    const data = await res.json();
    if (res.status === 400) {
      console.log("✓ Test 2 Passed: Invalid amount rejected with HTTP 400");
      passed++;
    } else {
      console.error("✗ Test 2 Failed: Expected 400", data);
      failed++;
    }
  } catch (err) {
    console.error("✗ Test 2 Error:", err);
    failed++;
  }

  // TEST 3: Create Order successfully (minimum 100 paise)
  let createdOrderId = "";
  try {
    const req = createMockRequest("http://localhost:3000/api/create-order", {
      amount: 25000, // ₹250.00
      currency: "INR",
      receipt: `rcpt_test_${Date.now()}`,
    });
    const res = await createOrderHandler(req);
    const data = await res.json();
    if (res.status === 200 && data.order_id && data.amount === 25000 && data.currency === "INR") {
      createdOrderId = data.order_id;
      console.log(`✓ Test 3 Passed: Order created successfully -> ${data.order_id} (₹${data.amount / 100})`);
      passed++;
    } else {
      console.error("✗ Test 3 Failed: Unexpected response", res.status, data);
      failed++;
    }
  } catch (err) {
    console.error("✗ Test 3 Error:", err);
    failed++;
  }

  // TEST 4: Verify Payment - Missing required fields
  try {
    const req = createMockRequest("http://localhost:3000/api/verify-payment", {
      razorpay_order_id: "order_123",
      // missing payment_id and signature
    });
    const res = await verifyPaymentHandler(req);
    const data = await res.json();
    if (res.status === 400 && data.error.includes("Missing required fields")) {
      console.log("✓ Test 4 Passed: Missing fields rejected with HTTP 400");
      passed++;
    } else {
      console.error("✗ Test 4 Failed: Expected 400 for missing fields", data);
      failed++;
    }
  } catch (err) {
    console.error("✗ Test 4 Error:", err);
    failed++;
  }

  // TEST 5: Verify Payment - Signature mismatch
  try {
    const req = createMockRequest("http://localhost:3000/api/verify-payment", {
      razorpay_order_id: createdOrderId || "order_test_999",
      razorpay_payment_id: "pay_test_888",
      razorpay_signature: "tampered_fake_signature_hex_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    });
    const res = await verifyPaymentHandler(req);
    const data = await res.json();
    if (res.status === 400 && data.error.includes("Signature mismatch") && data.success === false) {
      console.log("✓ Test 5 Passed: Tampered signature rejected with HTTP 400");
      passed++;
    } else {
      console.error("✗ Test 5 Failed: Tampered signature should be rejected", data);
      failed++;
    }
  } catch (err) {
    console.error("✗ Test 5 Error:", err);
    failed++;
  }

  // TEST 6: Verify Payment - Valid HMAC-SHA256 signature
  try {
    const secret = process.env.RAZORPAY_KEY_SECRET || "UPcWD4unN6AsXllf35pyeyGl";
    const testOrderId = createdOrderId || "order_TutLLrvLpD6WHb";
    const testPaymentId = "pay_TutXYZ123456";

    // Generate genuine HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(`${testOrderId}|${testPaymentId}`)
      .digest("hex");

    const req = createMockRequest("http://localhost:3000/api/verify-payment", {
      razorpay_order_id: testOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSignature,
    });
    const res = await verifyPaymentHandler(req);
    const data = await res.json();
    if (res.status === 200 && data.success === true && data.order_id === testOrderId) {
      console.log("✓ Test 6 Passed: Valid signature verified successfully with HTTP 200");
      passed++;
    } else {
      console.error("✗ Test 6 Failed: Expected 200 with success: true", data);
      failed++;
    }
  } catch (err) {
    console.error("✗ Test 6 Error:", err);
    failed++;
  }

  console.log("==================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runTests();

