import { prisma } from "@/lib/db";
import { GRACE_PERIOD_DAYS } from "./subscription";

export interface ReminderResult {
  subscriptionId: string;
  tenantId: string;
  tenantName: string;
  daysRemaining: number;
  checkpoint: number; // 7, 3, 1, 0
  createdInApp: boolean;
  createdEmail: boolean;
}

export async function processSubscriptionRenewalReminders(): Promise<{
  processedCount: number;
  remindersSent: ReminderResult[];
  statusUpdates: { subscriptionId: string; newStatus: string }[];
}> {
  const now = new Date();
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: { in: ["ACTIVE", "PAST_DUE"] },
    },
    include: {
      tenant: true,
      plan: true,
    },
  });

  const remindersSent: ReminderResult[] = [];
  const statusUpdates: { subscriptionId: string; newStatus: string }[] = [];

  for (const sub of subscriptions) {
    const periodEnd = new Date(sub.currentPeriodEnd);
    const graceEnd =
      sub.gracePeriodEndsAt ||
      new Date(periodEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    const msUntilExpiry = periodEnd.getTime() - now.getTime();
    const daysUntilExpiry = msUntilExpiry / (1000 * 60 * 60 * 24);

    // 1. Expiry & Grace Period State Machine
    if (now > graceEnd && sub.status !== "EXPIRED") {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED" },
      });
      statusUpdates.push({ subscriptionId: sub.id, newStatus: "EXPIRED" });
      continue;
    } else if (now > periodEnd && now <= graceEnd && sub.status !== "PAST_DUE") {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "PAST_DUE" },
      });
      statusUpdates.push({ subscriptionId: sub.id, newStatus: "PAST_DUE" });
    }

    // 2. Identify Applicable Reminder Checkpoint (7, 3, 1, 0 days)
    let applicableCheckpoint: number | null = null;

    if (daysUntilExpiry <= 7.5 && daysUntilExpiry >= 6.0) {
      applicableCheckpoint = 7;
    } else if (daysUntilExpiry <= 3.5 && daysUntilExpiry >= 2.0) {
      applicableCheckpoint = 3;
    } else if (daysUntilExpiry <= 1.5 && daysUntilExpiry >= 0.5) {
      applicableCheckpoint = 1;
    } else if (daysUntilExpiry <= 0.5 && daysUntilExpiry >= -0.5) {
      applicableCheckpoint = 0; // Renewal date
    }

    if (applicableCheckpoint === null) continue;

    const checkpointDays = applicableCheckpoint;
    const planName = sub.plan?.name || "RestroNex";
    const title =
      checkpointDays === 0
        ? `Subscription Renews Today: ${planName} Plan`
        : `Subscription Renewal Reminder: ${checkpointDays} Day${checkpointDays > 1 ? "s" : ""} Remaining`;

    const message =
      checkpointDays === 0
        ? `Your ${planName} subscription for ${sub.tenant.name} is due for renewal today. Please renew to ensure uninterrupted POS billing access.`
        : `Your ${planName} subscription for ${sub.tenant.name} will renew in ${checkpointDays} days on ${periodEnd.toLocaleDateString("en-IN")}.`;

    // Idempotent In-App Reminder
    let createdInApp = false;
    try {
      await prisma.subscriptionNotification.create({
        data: {
          subscriptionId: sub.id,
          tenantId: sub.tenantId,
          daysBefore: checkpointDays,
          channel: "IN_APP",
          title,
          message,
          status: "SENT",
        },
      });
      createdInApp = true;
    } catch {
      // Duplicate key constraint violated: already sent for this checkpoint
    }

    // Idempotent Email Reminder
    let createdEmail = false;
    try {
      await prisma.subscriptionNotification.create({
        data: {
          subscriptionId: sub.id,
          tenantId: sub.tenantId,
          daysBefore: checkpointDays,
          channel: "EMAIL",
          title,
          message,
          status: "SENT",
          metadataJson: JSON.stringify({ recipientEmail: sub.tenant.email }),
        },
      });
      createdEmail = true;
    } catch {
      // Duplicate key constraint violated: already sent for this checkpoint
    }

    if (createdInApp || createdEmail) {
      remindersSent.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        tenantName: sub.tenant.name,
        daysRemaining: Math.round(daysUntilExpiry),
        checkpoint: checkpointDays,
        createdInApp,
        createdEmail,
      });
    }
  }

  return {
    processedCount: subscriptions.length,
    remindersSent,
    statusUpdates,
  };
}

export async function getTenantActiveRenewalReminders(tenantId: string) {
  return prisma.subscriptionNotification.findMany({
    where: {
      tenantId,
      channel: "IN_APP",
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}
