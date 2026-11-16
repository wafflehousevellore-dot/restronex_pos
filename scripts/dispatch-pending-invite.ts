import crypto from "crypto";
import { prisma } from "../src/lib/db";
import { clerkClient } from "@clerk/nextjs/server";

async function fixInvitation() {
  const inv = await prisma.staffInvitation.findUnique({
    where: { id: "cmwjli0ml000208jjjj3d0sh7" },
  });
  if (!inv) {
    console.log("Invitation not found");
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await prisma.staffInvitation.update({
    where: { id: inv.id },
    data: {
      rawToken,
      tokenHash,
    },
  });

  const inviteUrl = `https://www.restronexpos.com/staff/accept-invitation?token=${rawToken}`;
  console.log("ACTIVE_INVITE_URL:", inviteUrl);

  try {
    const client = await clerkClient();
    const clerkInv = await client.invitations.createInvitation({
      emailAddress: inv.email,
      redirectUrl: inviteUrl,
      ignoreExisting: true,
    });
    console.log("CLERK_EMAIL_SENT_SUCCESSFULLY:", inv.email, "Clerk ID:", clerkInv.id);
  } catch (err: any) {
    console.error("Clerk email dispatch notice:", err?.errors || err?.message || err);
  }
}

fixInvitation()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
