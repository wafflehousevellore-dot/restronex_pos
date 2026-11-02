import { NextRequest, NextResponse } from "next/server";
import { getRazorpayClient, getRazorpayKeyId, getRazorpayKeySecret } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const keyId = getRazorpayKeyId();
    const keySecret = getRazorpayKeySecret();

    // Check credentials configuration
    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay credentials not configured or unauthorized" },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { amount, currency = "INR", receipt, notes } = body || {};

    // Validate amount: minimum 100 paise
    const parsedAmount = Number(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount < 100) {
      return NextResponse.json(
        { error: "Invalid amount. Minimum amount is 100 paise (₹1.00)" },
        { status: 400 }
      );
    }

    const client = getRazorpayClient();
    const orderReceipt = receipt || `rcpt_${Date.now()}`;

    // Call Razorpay API to create order
    const order = await client.orders.create({
      amount: Math.round(parsedAmount),
      currency: currency || "INR",
      receipt: String(orderReceipt),
      notes: notes || {},
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
    });
  } catch (error: any) {
    console.error("Razorpay order creation error:", error);

    // Authentication failure from Razorpay API
    if (
      error?.statusCode === 401 ||
      error?.status === 401 ||
      error?.error?.code === "BAD_REQUEST_ERROR" &&
        typeof error?.error?.description === "string" &&
        error.error.description.toLowerCase().includes("unauthorized")
    ) {
      return NextResponse.json(
        { error: "Razorpay authentication failed. Verify API credentials." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: error?.error?.description || error?.message || "Internal server error creating Razorpay order",
      },
      { status: 500 }
    );
  }
}

