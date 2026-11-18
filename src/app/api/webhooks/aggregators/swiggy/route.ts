import { NextRequest } from "next/server";
import { POST as swiggyPost, GET as swiggyGet } from "@/app/api/webhooks/swiggy/route";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return swiggyPost(req);
}

export async function GET() {
  return swiggyGet();
}
