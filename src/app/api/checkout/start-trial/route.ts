import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Free trials have been disabled across RestroNex. Please choose a subscription plan to proceed.",
      code: "TRIAL_DISABLED",
      success: false,
    },
    { status: 403 }
  );
}
