import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const PROTECTED = ["/app", "/platform", "/checkout", "/organization"];

export default clerkMiddleware(async (auth, req) => {
  const session = req.cookies.get("restronex_session")?.value;
  const tokenParam = req.nextUrl.searchParams.get("token") || req.headers.get("x-auth-token");
  const isJWTAuth = !!session || !!tokenParam;
  const pathname = req.nextUrl.pathname;
  // Standard Razorpay checkout test page is public
  if (pathname === "/checkout/standard" || pathname === "/standard-checkout") {
    return;
  }
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isProtected) {
    const { userId } = await auth();
    if (!userId && !isJWTAuth) {
      const loginUrl = new URL("/sign-in", req.url);
      loginUrl.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files — run Clerk on everything else (required for handshake)
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
