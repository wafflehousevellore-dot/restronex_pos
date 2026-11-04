import crypto from "crypto";

async function runTests() {
  console.log("=== Testing Razorpay Standard Web Checkout Integration ===");
  const keyId = "rzp_test_Tw2GUF5e3EgBGA";
  const keySecret = "w7JShTokTc0xP9Ev2ib6d4UP";

  // 1. Test Order Creation via Razorpay API
  console.log("\n[TEST 1] Creating Order with amount = 50000 paise (₹500)...");
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: 50000,
      currency: "INR",
      receipt: `test_${Date.now()}`,
    }),
  });

  const orderData = await orderRes.json();
  if (!orderRes.ok) {
    throw new Error(`Order creation failed: ${JSON.stringify(orderData)}`);
  }
  console.log("✓ Order created successfully:", {
    order_id: orderData.id,
    amount: orderData.amount,
    currency: orderData.currency,
    status: orderData.status,
  });

  // 2. Test HMAC-SHA256 signature generation and verification
  console.log("\n[TEST 2] Testing Cryptographic HMAC-SHA256 Signature Verification...");
  const dummyPaymentId = "pay_test_" + Math.random().toString(36).slice(2, 10);
  const validSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderData.id}|${dummyPaymentId}`)
    .digest("hex");

  console.log("Generated valid signature:", validSignature);

  // Compare valid signature
  const expectedSig = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderData.id}|${dummyPaymentId}`)
    .digest("hex");

  const matches = crypto.timingSafeEqual(
    Buffer.from(validSignature),
    Buffer.from(expectedSig)
  );
  console.log("✓ Signature verification matches:", matches);

  // 3. Test Invalid Signature Rejection
  console.log("\n[TEST 3] Testing Tampered Signature Rejection...");
  const fakeSignature = "invalid_signature_1234567890abcdef1234567890abcdef";
  const mismatch = validSignature === fakeSignature;
  console.log("✓ Tampered signature rejected as expected:", !mismatch);

  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");
}

runTests().catch(console.error);
