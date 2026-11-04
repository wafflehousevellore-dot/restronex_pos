import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getWebhookSecret, verifyWebhookSignature } from "@/lib/razorpay";
import { decryptSecret } from "@/lib/encryption";

/**
 * RESTRO NEX UNIFIED RAZORPAY WEBHOOK PIPELINE
 * Handles both System A (Platform SaaS Subscriptions) & System B (Restaurant Customer Payments).
 * Enforces raw body HMAC verification, idempotent durable logging, and atomic state transitions.
 */
export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  let payload: any;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventType = payload.event as string;
  const paymentEntity = payload.payload?.payment?.entity;
  const orderEntity = payload.payload?.order?.entity;
  const subscriptionEntity = payload.payload?.subscription?.entity;
  const refundEntity = payload.payload?.refund?.entity;

  // Extract notes for tenant routing
  const notes =
    paymentEntity?.notes ||
    orderEntity?.notes ||
    subscriptionEntity?.notes ||
    refundEntity?.notes ||
    {};

  const tenantId = notes.tenantId || notes.tenant_id || null;
  const planSlug = notes.planSlug || notes.plan_slug || null;
  const isSubscriptionEvent =
    eventType.startsWith("subscription.") ||
    notes.type === "SUBSCRIPTION_MANUAL_RENEWAL" ||
    notes.type === "SUBSCRIPTION_PLAN_UPGRADE" ||
    (planSlug && !notes.orderId);

  // 1. Webhook Signature Verification
  let signatureVerified = false;

  // If System A (SaaS Subscription): verify with Platform Webhook Secret
  if (isSubscriptionEvent || !tenantId) {
    if (signature) {
      signatureVerified = verifyWebhookSignature(bodyText, signature);
    }
  } else {
    // System B (Customer Order): Check if tenant has their own webhook secret configured
    const tenantGateway = await prisma.tenantPaymentGatewayConfig.findUnique({
      where: { tenantId },
    });
    if (tenantGateway?.webhookSecretEncrypted) {
      const tenantSecret = decryptSecret(tenantGateway.webhookSecretEncrypted);
      if (tenantSecret && signature) {
        const expected = crypto.createHmac("sha256", tenantSecret).update(bodyText).digest("hex");
        signatureVerified = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
      }
    } else {
      // Fallback to platform webhook secret if tenant shares platform gateway
      if (signature) {
        signatureVerified = verifyWebhookSignature(bodyText, signature);
      }
    }
  }

  // Reject unverified webhooks if a signature was provided and webhook secret is set
  const hasPlatformSecret = !!getWebhookSecret();
  if (hasPlatformSecret && signature && !signatureVerified) {
    return NextResponse.json(
      { error: "Invalid webhook HMAC signature — request rejected" },
      { status: 400 }
    );
  }

  // 2. Durable Idempotency
  // Distinct deduplication key combining event type and primary entity ID
  const primaryId =
    paymentEntity?.id ||
    orderEntity?.id ||
    subscriptionEntity?.id ||
    refundEntity?.id ||
    `${Date.now()}`;
  const eventId = `${eventType}:${primaryId}`;

  const existingEvent = await prisma.webhookEvent.findUnique({ where: { eventId } });
  if (existingEvent) {
    return NextResponse.json({
      ok: true,
      deduped: true,
      eventId,
      processed: existingEvent.processed,
    });
  }

  // Durably record the event before processing
  const webhookRecord = await prisma.webhookEvent.create({
    data: {
      provider: "RAZORPAY",
      eventId,
      eventType,
      tenantId,
      payloadJson: bodyText,
      processed: false,
      status: "PENDING",
      attempts: 1,
    },
  });

  const now = new Date();

  try {
    // ----------------------------------------------------
    // SYSTEM A: SAAS SUBSCRIPTION EVENTS
    // ----------------------------------------------------
    if (isSubscriptionEvent) {
      if (
        eventType === "payment.captured" ||
        eventType === "order.paid" ||
        eventType === "subscription.activated" ||
        eventType === "subscription.charged"
      ) {
        const paymentId = paymentEntity?.id || primaryId;
        const amountPaise = paymentEntity?.amount || 0;

        if (tenantId && planSlug) {
          const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: planSlug } });
          if (plan) {
            const periodDays = notes.billingCycle === "ANNUAL" ? 365 : 30;
            const newPeriodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

            let sub = await prisma.subscription.findFirst({
              where: { tenantId, planId: plan.id },
            });

            if (sub) {
              sub = await prisma.subscription.update({
                where: { id: sub.id },
                data: {
                  status: "ACTIVE",
                  currentPeriodStart: now,
                  currentPeriodEnd: newPeriodEnd,
                  cancelAtPeriodEnd: false,
                  cancelledAt: null,
                },
              });
            } else {
              sub = await prisma.subscription.create({
                data: {
                  tenantId,
                  planId: plan.id,
                  status: "ACTIVE",
                  billingCycle: notes.billingCycle || "MONTHLY",
                  currentPeriodStart: now,
                  currentPeriodEnd: newPeriodEnd,
                },
              });
            }

            // Create or update subscription payment record
            await prisma.subscriptionPayment.upsert({
              where: { id: webhookRecord.id },
              create: {
                subscriptionId: sub.id,
                tenantId,
                amountPaise,
                status: "COMPLETED",
                provider: "RAZORPAY",
                providerPaymentId: paymentId,
                razorpayPaymentId: paymentId,
                razorpayOrderId: orderEntity?.id || null,
              },
              update: {
                status: "COMPLETED",
              },
            });

            await prisma.auditLog.create({
              data: {
                tenantId,
                action: "SUBSCRIPTION_ACTIVATED_VIA_WEBHOOK",
                entity: "Subscription",
                entityId: sub.id,
                metadataJson: JSON.stringify({ eventId, paymentId, amountPaise, planSlug }),
              },
            });
          }
        }
      } else if (eventType === "payment.failed" || eventType === "subscription.halted") {
        if (tenantId) {
          const sub = await prisma.subscription.findFirst({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
          });
          if (sub) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: { status: "PAST_DUE" },
            });
          }
        }
      } else if (
        eventType === "subscription.cancelled" ||
        eventType === "subscription.completed"
      ) {
        if (tenantId) {
          const sub = await prisma.subscription.findFirst({
            where: { tenantId, status: "ACTIVE" },
          });
          if (sub) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: { status: "CANCELLED", cancelledAt: now },
            });
          }
        }
      }
    }

    // ----------------------------------------------------
    // SYSTEM B: RESTAURANT CUSTOMER ORDERS & PAYMENTS
    // ----------------------------------------------------
    else {
      const orderId = notes.orderId || notes.order_id;

      if (eventType === "payment.captured" || eventType === "order.paid") {
        const paymentId = paymentEntity?.id || primaryId;
        const amountPaise = paymentEntity?.amount || 0;
        const razorpayOrderId = orderEntity?.id || paymentEntity?.order_id;

        // Find associated order
        let order = null;
        if (orderId) {
          order = await prisma.order.findUnique({ where: { id: orderId } });
        } else if (razorpayOrderId) {
          const attempt = await prisma.paymentAttempt.findFirst({
            where: { razorpayOrderId },
            include: { order: true },
          });
          order = attempt?.order || null;
        }

        if (order && !order.isPaid) {
          await prisma.$transaction(async (tx) => {
            // Update attempt if exists
            if (razorpayOrderId) {
              await tx.paymentAttempt.updateMany({
                where: { razorpayOrderId },
                data: {
                  status: "CAPTURED",
                  razorpayPaymentId: paymentId,
                  verifiedAt: now,
                },
              });
            }

            // Create Payment record
            await tx.payment.create({
              data: {
                orderId: order.id,
                tenantId: order.tenantId,
                outletId: order.outletId,
                method: "RAZORPAY_ONLINE",
                amountPaise: amountPaise || order.totalPaise,
                status: "COMPLETED",
                isGatewayConfirmed: true,
                razorpayPaymentId: paymentId,
                reference: paymentId,
              },
            });

            // Mark order as paid
            await tx.order.update({
              where: { id: order.id },
              data: {
                isPaid: true,
                status: "BILLED",
                paidAt: now,
                billClosedAt: now,
              },
            });
          });
        }
      } else if (eventType === "payment.failed") {
        const razorpayOrderId = orderEntity?.id || paymentEntity?.order_id;
        if (razorpayOrderId) {
          await prisma.paymentAttempt.updateMany({
            where: { razorpayOrderId },
            data: {
              status: "FAILED",
              errorCode: paymentEntity?.error_code,
              errorMessage: paymentEntity?.error_description,
            },
          });
        }
      } else if (eventType === "refund.processed" || eventType === "refund.created") {
        const razorpayRefundId = refundEntity?.id || primaryId;
        const razorpayPaymentId = refundEntity?.payment_id || paymentEntity?.id;

        if (razorpayPaymentId) {
          const payment = await prisma.payment.findFirst({
            where: { razorpayPaymentId },
          });
          if (payment) {
            const refundAmount = refundEntity?.amount || payment.amountPaise;
            await prisma.paymentRefund.upsert({
              where: { id: webhookRecord.id },
              create: {
                tenantId: payment.tenantId || "",
                paymentId: payment.id,
                orderId: payment.orderId,
                amountPaise: refundAmount,
                reason: refundEntity?.notes?.reason || "Refund via Razorpay Webhook",
                status: "PROCESSED",
                razorpayRefundId,
              },
              update: {
                status: "PROCESSED",
              },
            });

            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: "REFUNDED",
                refundedPaise: refundAmount,
              },
            });
          }
        }
      }
    }

    // Mark event as processed durably
    await prisma.webhookEvent.update({
      where: { id: webhookRecord.id },
      data: {
        processed: true,
        status: "PROCESSED",
        processedAt: now,
      },
    });

    return NextResponse.json({ ok: true, eventId, processed: true });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    await prisma.webhookEvent.update({
      where: { id: webhookRecord.id },
      data: {
        processed: false,
        status: "FAILED",
        error: err.message,
      },
    });

    // Return 500 so Razorpay retries
    return NextResponse.json({ ok: false, error: err.message, eventId }, { status: 500 });
  }
}
