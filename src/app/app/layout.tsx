export const dynamic = "force-dynamic";
import AppShell from "@/components/app/AppShell";
import { getSession, getActiveOrgId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-in-production-32chars!!";

async function getSessionWithTokenFallback(): Promise<{ user: { id:string; email:string; name:string; avatarUrl?:string|null; isPlatformAdmin?:boolean }|null, userId:string|null }>{
  const base = await getSession();
  if(base.userId) return base;
  // Fallback for E2B iframe where HttpOnly cookie was blocked as third-party:
  // Try token from ?token=xxx or header x-auth-token
  try{
    const h = await headers();
    const c = await cookies();
    // Check URL token via headers (we can try to get it from referer? better check searchParams via headers not available here)
    // Instead check for js cookie fallback
    const jsToken = c.get("restronex_session_js")?.value;
    const token = jsToken || h.get("x-auth-token") || "";
    if(token){
      const decoded = jwt.verify(token, JWT_SECRET) as unknown as { sub:string };
      const dbUser = await prisma.user.findUnique({ where:{ id: decoded.sub }});
      if(dbUser){
        // Also seed httpOnly cookie for next navigation via response (layout can't set, but POS page will)
        return { user: { id:dbUser.id, email:dbUser.email, name:dbUser.name, avatarUrl:dbUser.avatarUrl, isPlatformAdmin:dbUser.isPlatformAdmin }, userId: dbUser.id };
      }
    }
  }catch{}
  return base;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, userId } = await getSessionWithTokenFallback();
  if (!userId || !user) redirect("/sign-in");
  let tenant: unknown = null;
  let outlet: unknown = null;
  const activeOrgId = await getActiveOrgId();
  if (activeOrgId) {
    const t = await prisma.tenant.findUnique({ where:{ id: activeOrgId }, include:{ outlets:true }});
    if(t){ tenant = t; outlet = (t as unknown as { outlets: unknown[] }).outlets[0] || null; }
  }
  if(!tenant){
    const mem = await prisma.membership.findFirst({ where:{ userId }, include:{ tenant:{ include:{ outlets:true } } }});
    if(mem){ tenant = mem.tenant; outlet = (mem.tenant as unknown as { outlets: unknown[] }).outlets[0]||null; }
  }
  return <AppShell user={user as unknown as never} tenant={tenant as never} outlet={outlet as never}>{children}</AppShell>;
}
