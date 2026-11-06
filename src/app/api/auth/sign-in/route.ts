import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signInSchema } from "@/lib/validators";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { isHttpsFromRequest } from "@/lib/auth";

export async function GET(){
  return NextResponse.json({ error: "Method Not Allowed. Use official authentication." }, { status: 405 });
}

export async function POST(req: NextRequest){
  try{
    const ct = req.headers.get("content-type") || "";
    let data: any;
    if (ct.includes("application/json")) {
      data = await req.json();
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      data = Object.fromEntries(form.entries());
    } else {
      try { data = await req.json(); } catch { const form = await req.formData(); data = Object.fromEntries(form.entries()); }
    }
    const parsed = signInSchema.safeParse(data);
    if(!parsed.success) {
      if (ct.includes("form-urlencoded") || req.headers.get("accept")?.includes("text/html")) {
        return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(parsed.error.issues[0].message)}`, req.url));
      }
      return NextResponse.json({error: parsed.error.issues[0].message},{status:400});
    }
    const user = await prisma.user.findUnique({ where:{ email: parsed.data.email }});
    if(!user) {
      if (ct.includes("form-urlencoded") || req.headers.get("accept")?.includes("text/html")) {
        return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent("Invalid credentials")}`, req.url));
      }
      return NextResponse.json({error:"Invalid credentials"},{status:401});
    }
    const logs = await prisma.auditLog.findMany({ where:{ entity:"User", entityId:user.id, action:"USER_SIGNUP"}, orderBy:{createdAt:"desc"}, take:1 });
    let hash: string | null = null;
    if(logs.length && logs[0].metadataJson){
      try{ const m=JSON.parse(logs[0].metadataJson); hash=m.pwHash; }catch{}
    }
    let valid=false;
    if(hash){ valid=await bcrypt.compare(parsed.data.password, hash); }
    else { valid = false; }
    if(!valid) {
      if (ct.includes("form-urlencoded") || req.headers.get("accept")?.includes("text/html")) {
        return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent("Invalid credentials")}`, req.url));
      }
      return NextResponse.json({error:"Invalid credentials"},{status:401});
    }
    const isHttps = isHttpsFromRequest(req);
    const token = await createSession({ id:user.id, email:user.email, name:user.name, isPlatformAdmin: user.isPlatformAdmin }, { secure: isHttps });
    const mem = await prisma.membership.findFirst({ where: { userId: user.id } });

    const nextUrl = (data.next as string) || req.nextUrl.searchParams.get("next") || "/app/dashboard";
    const plan = (data.plan as string) || req.nextUrl.searchParams.get("plan");
    const cycle = (data.cycle as string) || req.nextUrl.searchParams.get("cycle");
    const accept = req.headers.get("accept") || "";
    if (ct.includes("form-urlencoded") || accept.includes("text/html")) {
      const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${nextUrl}"><script>window.location.href="${nextUrl}"</script></head><body>Redirecting to dashboard... <a href="${nextUrl}">click here</a></body></html>`;
      const res = new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html" } });
      res.cookies.set("restronex_session", token, { httpOnly: true, secure: isHttps, sameSite: isHttps ? "none" : "lax", path: "/", maxAge: 60*60*24*7 });
      if (mem?.tenantId) {
        res.cookies.set("restronex_org", mem.tenantId, { path: "/", maxAge: 60*60*24*30, sameSite: "lax" });
      }
      if (plan) res.cookies.set("restronex_plan", plan, { path:"/", maxAge:60*60*24*30 });
      if (cycle) res.cookies.set("restronex_cycle", cycle, { path:"/", maxAge:60*60*24*30 });
      return res;
    }
    const jsonRes = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, isPlatformAdmin: user.isPlatformAdmin },
      token,
      tenantId: mem?.tenantId || null,
      next: nextUrl,
    });
    jsonRes.cookies.set("restronex_session", token, { httpOnly: true, secure: isHttps, sameSite: isHttps ? "none" : "lax", path: "/", maxAge: 60*60*24*7 });
    if (mem?.tenantId) {
      jsonRes.cookies.set("restronex_org", mem.tenantId, { path: "/", maxAge: 60*60*24*30, sameSite: "lax" });
    }
    if (plan) jsonRes.cookies.set("restronex_plan", plan, { path:"/", maxAge:60*60*24*30 });
    if (cycle) jsonRes.cookies.set("restronex_cycle", cycle, { path:"/", maxAge:60*60*24*30 });
    return jsonRes;
  }catch(e:any){ return NextResponse.json({error:e.message},{status:500});}
}
