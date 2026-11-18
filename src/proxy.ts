import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const PROTECTED = ["/app", "/platform", "/platform-admin", "/checkout", "/organization"];
const PUBLIC_STAFF_ROUTES = ["/staff/login", "/staff/accept-invitation", "/staff/auth-callback"];
const PUBLIC_OWNER_ROUTES = ["/owner/login", "/owner/signup", "/login"];

export default clerkMiddleware(async (auth, req) => {
  const session = req.cookies.get("restronex_session")?.value;
  const tokenParam = req.nextUrl.searchParams.get("token") || req.headers.get("x-auth-token");
  const isJWTAuth = !!session || !!tokenParam;
  const pathname = req.nextUrl.pathname;

  // Public staff and owner authentication entry points
  if (
    PUBLIC_STAFF_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    PUBLIC_OWNER_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return;
  }

  // Standard Razorpay checkout test page is public
  if (pathname === "/checkout/standard" || pathname === "/standard-checkout") {
    return;
  }

  // Staff application route guard
  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    const { userId } = await auth();
    if (!userId && !isJWTAuth) {
      const loginUrl = new URL("/staff/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return;
  }

  const isPlatformRoute =
    pathname === "/platform" ||
    pathname.startsWith("/platform/") ||
    pathname === "/platform-admin" ||
    pathname.startsWith("/platform-admin/");
  if (isPlatformRoute) {
    // Platform Admin portal strictly requires Clerk authentication (no JWT fallback bypass)
    const { userId } = await auth();
    if (!userId) {
      const loginUrl = new URL("/sign-in", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return;
  }

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isProtected) {
    const { userId } = await auth();
    if (!userId && !isJWTAuth) {
      const loginUrl = new URL("/owner/login", req.url);
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
