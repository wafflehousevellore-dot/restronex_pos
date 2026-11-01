import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getRazorpayKeySecret } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};

    // Validate missing fields: return 400
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        {
          error: "Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
        },
        { status: 400 }
      );
    }

    const secret = getRazorpayKeySecret();
    if (!secret) {
      return NextResponse.json(
        { error: "Razorpay secret key is not configured on server" },
        { status: 500 }
      );
    }

    // Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // Timing-safe comparison to prevent timing attacks
    let signaturesMatch = false;
    if (expectedSignature.length === razorpay_signature.length) {
      try {
        signaturesMatch = crypto.timingSafeEqual(
          Buffer.from(expectedSignature),
          Buffer.from(razorpay_signature)
        );
      } catch {
        signaturesMatch = false;
      }
    }

    // Signature mismatch: return 400, do NOT mark as paid
    if (!signaturesMatch) {
      return NextResponse.json(
        {
          error: "Payment verification failed: Signature mismatch",
          success: false,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
    });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during verification" },
      { status: 500 }
    );
  }
}

