import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signUpSchema } from "@/lib/validators";
import bcrypt from "bcryptjs";
import { createSession, isHttpsFromRequest } from "@/lib/auth";
import { ensureSeedPlans } from "@/lib/seed";

export async function POST(req: NextRequest){
  try{
    await ensureSeedPlans();
    const ct = req.headers.get("content-type") || "";
    let data: any;
    if (ct.includes("application/json")) data = await req.json();
    else if (ct.includes("x-www-form-urlencoded")) { const f=await req.formData(); data=Object.fromEntries(f.entries()); }
    else { try{ data=await req.json(); }catch{ const f=await req.formData(); data=Object.fromEntries(f.entries()); } }
    const parsed = signUpSchema.safeParse(data);
    if(!parsed.success) {
      if (ct.includes("form-urlencoded")) return NextResponse.redirect(new URL(`/sign-up?error=${encodeURIComponent(parsed.error.issues[0].message)}`, req.url));
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status:400 });
    }
    const exists = await prisma.user.findUnique({ where:{ email: parsed.data.email }});
    if(exists) {
      if (ct.includes("form-urlencoded")) return NextResponse.redirect(new URL(`/sign-up?error=${encodeURIComponent("Email already registered. Please sign in.")}`, req.url));
      return NextResponse.json({ error: "Email already registered. Please sign in." }, { status:400 });
    }
    const hash = await bcrypt.hash(parsed.data.password, 10);
    const user = await prisma.user.create({ data: { email: parsed.data.email, name: parsed.data.name, role: "OWNER", isPlatformAdmin: false, clerkId: hash.slice(0,20) }});
    await prisma.auditLog.create({ data: { userId: user.id, action: "USER_SIGNUP", entity:"User", entityId: user.id, metadataJson: JSON.stringify({ email:user.email, pwHash: hash }) }});
    await createSession({ id: user.id, email: user.email, name: user.name }, { secure: isHttpsFromRequest(req) });
    const nextUrl = (data.next as string) || req.nextUrl.searchParams.get("next") || "/app/organization";
    const plan = (data.plan as string) || req.nextUrl.searchParams.get("plan");
    const cycle = (data.cycle as string) || req.nextUrl.searchParams.get("cycle");
    const accept = req.headers.get("accept") || "";
    if (ct.includes("form-urlencoded") || accept.includes("text/html")) {
      const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${nextUrl}"><script>window.location.href="${nextUrl}"</script></head><body>Redirecting... <a href="${nextUrl}">click here</a></body></html>`;
      const res = new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html" } });
      if (plan) res.cookies.set("restronex_plan", plan, { path:"/", maxAge: 60*60*24*30 });
      if (cycle) res.cookies.set("restronex_cycle", cycle, { path:"/", maxAge: 60*60*24*30 });
      return res;
    }
    const jsonRes = NextResponse.json({ ok:true, userId: user.id, next: nextUrl });
    if (plan) jsonRes.cookies.set("restronex_plan", plan, { path:"/", maxAge: 60*60*24*30 });
    if (cycle) jsonRes.cookies.set("restronex_cycle", cycle, { path:"/", maxAge: 60*60*24*30 });
    return jsonRes;
  }catch(e:any){ return NextResponse.json({ error:e.message },{ status:500}); }
}
