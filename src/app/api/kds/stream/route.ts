import { NextRequest } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { subscribeKdsEvents } from "@/lib/kds-events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) {
    return new Response("Tenant required", { status: 400 });
  }

  const outletId = req.nextUrl.searchParams.get("outletId");

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connection ACK
  writer.write(encoder.encode(`event: connected\ndata: ${JSON.stringify({ tenantId, outletId, time: new Date() })}\n\n`));

  // Subscribe to in-process KDS events
  const unsubscribe = subscribeKdsEvents(tenantId, outletId || null, (event) => {
    try {
      writer.write(encoder.encode(`event: kds_event\ndata: ${JSON.stringify(event)}\n\n`));
    } catch {
      // client disconnected
    }
  });

  // Heartbeat interval to keep connection alive
  const pingInterval = setInterval(() => {
    try {
      writer.write(encoder.encode(`: ping ${Date.now()}\n\n`));
    } catch {
      clearInterval(pingInterval);
    }
  }, 15000);

  req.signal.addEventListener("abort", () => {
    clearInterval(pingInterval);
    unsubscribe();
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
