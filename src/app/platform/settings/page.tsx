export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { GST_BPS } from "@/lib/checkout";
import { getPlatformOwnerSession } from "@/lib/platform-auth";
import { isRazorpayConfigured, isRazorpayLiveMode, isWebhookConfigured } from "@/lib/razorpay";
import SettingsAdminClient from "./SettingsAdminClient";

export default async function PlatformSettings() {
  const authResult = await getPlatformOwnerSession();
  if (!authResult.authorized || !("user" in authResult)) {
    redirect("/platform");
  }

  return (
    <SettingsAdminClient
      primaryOwnerEmail={authResult.user.email}
      mfaEnrolled={authResult.mfaEnrolled}
      mfaVerifiedInSession={authResult.mfaVerifiedInSession}
      gstBps={GST_BPS}
      razorpayConfigured={isRazorpayConfigured()}
      razorpayLiveMode={isRazorpayLiveMode()}
      webhookConfigured={isWebhookConfigured()}
      clerkConfigured={Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}
    />
  );
}
