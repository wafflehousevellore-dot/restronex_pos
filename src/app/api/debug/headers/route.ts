import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerApi } from "@/lib/platform-auth";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest){
  const guard = await requirePlatformOwnerApi();
  if (!guard.ok) return guard.response;
  const h = Object.fromEntries(req.headers.entries());
  const cookies = req.cookies.getAll().map(c=>`${c.name}=${c.value.slice(0,10)}...`);
  return NextResponse.json({ host: req.headers.get("host"), proto: req.headers.get("x-forwarded-proto"), forwardedHost: req.headers.get("x-forwarded-host"), forwardedProto: req.headers.get("x-forwarded-proto"), url: req.url, cookies, headers: h });
}
