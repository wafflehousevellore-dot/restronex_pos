import { NextRequest } from "next/server";
import { POST as zomatoPost, GET as zomatoGet } from "@/app/api/webhooks/zomato/route";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return zomatoPost(req);
}

export async function GET() {
  return zomatoGet();
}
