import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
import {
  loadInvoicePdfPayload,
  verifyInvoiceAccessToken,
} from "@/lib/invoice-storage";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { STORAGE_BUCKETS } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  try {
    const { invoiceNumber } = await params;
    if (!invoiceNumber) {
      return NextResponse.json({ error: "Invoice number required" }, { status: 400 });
    }

    const sp = req.nextUrl.searchParams;
    const tid = sp.get("tid");
    const exp = sp.get("exp");
    const sig = sp.get("sig");

    let authorizedTenantId: string | undefined;

    // 1. Time-bound HMAC signed access token (used for Meta Cloud API attachment & customer link)
    if (tid && exp && sig) {
      const valid = verifyInvoiceAccessToken(tid, invoiceNumber, exp, sig);
      if (!valid) {
        return NextResponse.json({ error: "Invalid or expired invoice download link" }, { status: 403 });
      }
      authorizedTenantId = tid;
    } else {
      // 2. Otherwise require authenticated session belonging to the invoice's tenant
      const { userId } = await getSession();
      if (!userId) {
        return NextResponse.json({ error: "Authentication required to access private invoice PDF" }, { status: 401 });
      }
      const [invMeta, dbUser] = await Promise.all([
        prisma.invoiceRecord.findFirst({
          where: { invoiceNumber },
          select: { tenantId: true },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, isPlatformAdmin: true },
        }),
      ]);
      if (!invMeta) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      const isPlatformOwner = Boolean(
        dbUser?.role === "PLATFORM_OWNER" && dbUser?.isPlatformAdmin
      );
      if (!isPlatformOwner) {
        const mem = await prisma.membership.findFirst({
          where: { userId, tenantId: invMeta.tenantId },
        });
        if (!mem) {
          return NextResponse.json({ error: "Forbidden: Cross-tenant invoice access denied" }, { status: 403 });
        }
      }
      authorizedTenantId = invMeta.tenantId;
    }

    const payload = await loadInvoicePdfPayload(invoiceNumber, authorizedTenantId);
    if (!payload) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    let pdfBuffer: Buffer | null = null;

    // Attempt read from private Supabase Storage bucket first if path recorded
    if (
      payload.invoice.pdfStoragePath &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ) {
      try {
        const admin = createSupabaseAdminClient();
        const { data: blob, error } = await admin.storage
          .from(STORAGE_BUCKETS.PRIVATE_DOCS)
          .download(payload.invoice.pdfStoragePath);
        if (!error && blob) {
          pdfBuffer = Buffer.from(await blob.arrayBuffer());
        }
      } catch {}
    }

    if (!pdfBuffer) {
      pdfBuffer = await generateInvoicePDF(payload.pdfData);
    }

    const filename = `Invoice-${invoiceNumber}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err: any) {
    console.error("Failed to generate invoice PDF:", err);
    return NextResponse.json({ error: "Failed to serve invoice PDF" }, { status: 500 });
  }
}
