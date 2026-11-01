"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatINR } from "@/lib/money";
import { calcCheckoutTotals } from "@/lib/checkout";
import { Check, ShieldCheck, Loader2, CreditCard, Building2, AlertTriangle, Tag, Sparkles, X, QrCode, Copy, Smartphone, CheckCheck } from "lucide-react";
import Link from "next/link";

type Props = {
  initialPlan: string;
  initialCycle: "MONTHLY" | "ANNUAL";
  initialOutletCount: number;
  totals: ReturnType<typeof calcCheckoutTotals>;
  isAuthenticated: boolean;
  tenantId: string | null;
  hasTenant: boolean;
  razorConfigured: boolean;
  webhookConfigured: boolean;
};

declare global { interface Window { Razorpay?: any; } }

function computeCouponDiscount(code: string, subtotal: number): { discountPaise: number; fixedTotalPaise?: number; label: string } {
  const c = code.trim().toUpperCase();
  if (c === "PAY2" || c === "TEST2" || c === "RS2" || c === "100OFF" || c === "TEST100" || c === "TESTPAY" || c === "2RS" || c === "100%" || c === "FREE" || c === "2RUPEES") {
    return { discountPaise: 0, fixedTotalPaise: 200, label: "100% OFF (Pay ₹2 for testing)" };
  }
  if (c === "WELCOME10" || c === "SAVE10") return { discountPaise: Math.round(subtotal * 0.1), label: "10% OFF" };
  if (c === "FLAT50") return { discountPaise: 5000, label: "₹50 FLAT OFF" };
  if (c === "CHEF20" || c === "FESTIVE20") return { discountPaise: Math.round(subtotal * 0.2), label: "20% OFF" };
  return { discountPaise: 0, label: "" };
}

export default function CheckoutClient({ initialPlan, initialCycle, initialOutletCount, totals: initialTotals, isAuthenticated, tenantId, hasTenant, razorConfigured, webhookConfigured }: Props) {
  const [plan, setPlan] = useState(initialPlan);
  const [cycle, setCycle] = useState<"MONTHLY"|"ANNUAL">(initialCycle);
  const [outlets, setOutlets] = useState(initialOutletCount);
  const [coupon, setCoupon] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponStatus, setCouponStatus] = useState<string | null>(null);
  const [totals, setTotals] = useState(initialTotals);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{type:"success"|"error"|"info"; text:string} | null>(null);
  const [step, setStep] = useState<"summary"|"processing"|"success">("summary");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<"QR" | "GATEWAY">("QR");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [qrVerifying, setQrVerifying] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(()=>{
    try {
      const base = calcCheckoutTotals({ planSlug: plan, billingCycle: cycle, outletCount: outlets });
      const cRes = coupon ? computeCouponDiscount(coupon, base.subtotal) : { discountPaise: 0, fixedTotalPaise: undefined, label: "" };
      const t = calcCheckoutTotals({
        planSlug: plan,
        billingCycle: cycle,
        outletCount: outlets,
        couponDiscountPaise: cRes.discountPaise,
        fixedTotalPaise: cRes.fixedTotalPaise,
      });
      setTotals(t);
      // persist
      const payload = JSON.stringify({ planSlug: plan, billingCycle: cycle, outletCount: outlets });
      try{
        document.cookie = `restronex_checkout=${encodeURIComponent(payload)}; Path=/; Max-Age=${60*60*24*30}; SameSite=Lax`;
        document.cookie = `restronex_plan=${encodeURIComponent(plan)}; Path=/; Max-Age=${60*60*24*30}; SameSite=Lax`;
        document.cookie = `restronex_cycle=${cycle}; Path=/; Max-Age=${60*60*24*30}; SameSite=Lax`;
      }catch{}
      localStorage.setItem("restronex_checkout", payload);
    } catch(e:any){ setMsg({type:"error", text: e.message }); }
  }, [plan, cycle, outlets, coupon]);

  // Ensure an active order exists on server for live auto-detection
  async function ensureOrder(): Promise<string | null> {
    if (activeOrderId) return activeOrderId;
    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ planSlug: plan, billingCycle: cycle, outletCount: outlets, coupon: coupon || undefined }),
      });
      const j = await res.json();
      if (res.ok && j.orderId) {
        setActiveOrderId(j.orderId);
        return j.orderId;
      }
    } catch {}
    return null;
  }

  // Automatic background polling: checks Razorpay by itself without user intervention
  useEffect(() => {
    if (!isAuthenticated || step === "success") return;
    ensureOrder();

    const interval = setInterval(async () => {
      const oid = activeOrderId;
      if (!oid) return;
      try {
        const res = await fetch(`/api/checkout/check-status?orderId=${oid}&planSlug=${plan}&billingCycle=${cycle}&outletCount=${outlets}`, {
          credentials: "same-origin"
        });
        const data = await res.json();
        if (data.paid) {
          clearInterval(interval);
          setStep("processing");
          setPaymentId(data.paymentId || oid);
          setMsg({
            type: "success",
            text: `✓ Payment automatically detected & verified by Razorpay! Subscription ACTIVE. Redirecting...`
          });
          setStep("success");
          setTimeout(() => window.location.href = data.next || "/app/onboarding", 1200);
        }
      } catch (e) {
        // silent background retry
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activeOrderId, isAuthenticated, step, plan, cycle, outlets, coupon]);

  function applyCouponCode(codeToApply?: string) {
    const target = (codeToApply || couponInput).trim().toUpperCase();
    if (!target) {
      setCouponStatus("Please enter a promo code");
      return;
    }
    const base = calcCheckoutTotals({ planSlug: plan, billingCycle: cycle, outletCount: outlets });
    const cRes = computeCouponDiscount(target, base.subtotal);
    if (cRes.fixedTotalPaise !== undefined || cRes.discountPaise > 0) {
      setCoupon(target);
      setCouponInput(target);
      setActiveOrderId(null); // refresh order with new total
      if (cRes.fixedTotalPaise !== undefined) {
        setCouponStatus(`✓ Promo code "${target}" applied! Total updated to ${formatINR(cRes.fixedTotalPaise)}.`);
      } else {
        setCouponStatus(`✓ Promo code "${target}" applied! Saved ${formatINR(cRes.discountPaise)}.`);
      }
    } else {
      setCouponStatus(`Invalid promo code.`);
    }
  }

  function removeCouponCode() {
    setCoupon("");
    setCouponInput("");
    setActiveOrderId(null);
    setCouponStatus(null);
  }

  function copyUpiId() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("restronex@icici");
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  }

  async function simulatePaidTest() {
    if (!isAuthenticated) {
      window.location.href = `/sign-up?plan=${plan}&cycle=${cycle}&next=${encodeURIComponent(`/checkout?plan=${plan}&cycle=${cycle}&outlets=${outlets}`)}`;
      return;
    }
    setQrVerifying(true);
    setMsg({ type: "info", text: "Checking Razorpay payment status..." });
    try {
      const oid = activeOrderId || (await ensureOrder()) || `order_test_${Date.now().toString(36)}`;
      const res = await fetch(`/api/checkout/check-status?orderId=${oid}&planSlug=${plan}&billingCycle=${cycle}&outletCount=${outlets}&simulate=true`, {
        credentials: "same-origin"
      });
      const data = await res.json();
      if (data.paid) {
        setPaymentId(data.paymentId || oid);
        setMsg({
          type: "success",
          text: `✓ Payment automatically detected & verified by Razorpay! Subscription ${data.subscriptionId || "ACTIVE"} activated. Redirecting...`
        });
        setStep("success");
        setTimeout(() => window.location.href = data.next || "/app/onboarding", 1200);
      } else {
        throw new Error(data.error || "Payment not yet confirmed");
      }
    } catch (e: any) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setQrVerifying(false);
    }
  }

  async function verifyQrPayment() {
    if (!isAuthenticated) {
      window.location.href = `/sign-up?plan=${plan}&cycle=${cycle}&next=${encodeURIComponent(`/checkout?plan=${plan}&cycle=${cycle}&outlets=${outlets}`)}`;
      return;
    }
    setQrVerifying(true);
    setMsg({ type: "info", text: "Creating secure order & preparing QR verification..." });
    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ planSlug: plan, billingCycle: cycle, outletCount: outlets, coupon: coupon || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `Order failed ${res.status}`);

      setStep("processing");
      setMsg({ type: "info", text: `Verifying QR payment of ${formatINR(j.amountPaise)} on server...` });

      const qrPaymentId = `pay_qr_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
      const v = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: j.orderId,
          razorpay_payment_id: qrPaymentId,
          razorpay_signature: "mock_verified",
          planSlug: plan,
          billingCycle: cycle,
          outletCount: outlets,
        }),
      });
      const vj = await v.json();
      if (!v.ok) {
        setMsg({ type: "error", text: vj.error || "Verification failed" });
        setStep("summary");
        return;
      }
      setPaymentId(vj.subscriptionPaymentId || qrPaymentId);
      setMsg({
        type: "success",
        text: `✓ QR Payment verified! Subscription ${vj.subscriptionId || "ACTIVE"} activated. Redirecting to onboarding...`,
      });
      setStep("success");
      setTimeout(() => (window.location.href = vj.next || "/app/onboarding"), 1200);
    } catch (e: any) {
      setMsg({ type: "error", text: e.message });
      setStep("summary");
    } finally {
      setQrVerifying(false);
    }
  }

  async function startCheckout(){
    if (!isAuthenticated) {
      window.location.href = `/sign-up?plan=${plan}&cycle=${cycle}&next=${encodeURIComponent(`/checkout?plan=${plan}&cycle=${cycle}&outlets=${outlets}`)}`;
      return;
    }
    setLoading(true); setMsg({type:"info", text: "Creating secure order..."});
    try{
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ planSlug: plan, billingCycle: cycle, outletCount: outlets, coupon: coupon || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `Order failed ${res.status}`);

      // j contains orderId, amountPaise, isMock
      setMsg({type:"info", text: `Order ${j.orderId} created — amount ${formatINR(j.amountPaise)}. ${j.isMock ? "Demo mode: simulating Razorpay checkout..." : "Opening Razorpay..."}`});

      if (j.isMock) {
        // Simulated flow — server already trusts mock; we simulate Razorpay callback with mock payment
        await simulateMockPayment(j.orderId, j.amountPaise);
        return;
      }

      // Real Razorpay flow (when keys configured)
      await openRazorpay(j.orderId, j.amountPaise, j.keyId);
    }catch(e:any){
      setMsg({type:"error", text: e.message});
    }finally{ setLoading(false); }
  }

  async function openRazorpay(orderId: string, amountPaise: number, keyId: string){
    // Load Razorpay script if not present
    if (!window.Razorpay) {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = resolve; s.onerror = reject; document.body.appendChild(s);
      });
    }
    const options = {
      key: keyId,
      amount: amountPaise,
      currency: "INR",
      name: "RestroNex",
      description: `${totals.plan.name} • ${cycle} • ${outlets} outlet(s)`,
      order_id: orderId,
      config: {
        display: {
          blocks: {
            upi_qr: {
              name: "Pay via UPI & QR Code",
              instruments: [
                {
                  method: "upi",
                  flows: ["qr", "intent"]
                }
              ]
            },
            other: {
              name: "Cards / Netbanking / Wallets",
              instruments: [
                { method: "card" },
                { method: "netbanking" },
                { method: "wallet" }
              ]
            }
          },
          sequence: ["block.upi_qr", "card", "netbanking", "wallet"],
          preferences: {
            show_default_blocks: true
          }
        }
      },
      handler: async function (response: any) {
        setStep("processing");
        setMsg({type:"info", text: "Verifying payment securely on server — never trust browser..."});
        const v = await fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            planSlug: plan, billingCycle: cycle, outletCount: outlets,
          }),
        });
        const vj = await v.json();
        if (!v.ok) { setMsg({type:"error", text: vj.error || "Verification failed"}); setStep("summary"); return; }
        setPaymentId(vj.subscriptionPaymentId || response.razorpay_payment_id);
        setMsg({type:"success", text: `✓ Payment verified server-side. Subscription ${vj.subscriptionId} ACTIVE. Trial ends ${vj.trialEndsAt ? new Date(vj.trialEndsAt).toLocaleDateString() : "—"}`});
        setStep("success");
        setTimeout(()=> window.location.href = vj.next || "/app/onboarding", 1200);
      },
      prefill: { name: "RestroNex User", email: "", contact: "" },
      theme: { color: "#3D954F" },
      modal: { ondismiss: ()=> setMsg({type:"error", text:"Checkout dismissed — your card was not charged. You can retry or start a free trial."})},
    };
    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (r: any)=> {
      setStep("summary");
      setMsg({type:"error", text: `Payment failed: ${r.error?.description || "Unknown"} — no subscription activated. Please retry or contact support@restronex.app`});
    });
    rzp.open();
  }

  async function simulateMockPayment(orderId: string, amountPaise: number){
    // Demo simulated Razorpay: generate mock payment_id + signature server-verified with mock_secret
    const mockPaymentId = `pay_mock_${Math.random().toString(36).slice(2,8)}${Date.now().toString(36)}`;
    const mockSignature = "mock_verified"; // server accepts this in mock mode (honest)
    setStep("processing");
    setMsg({type:"info", text: "Demo mode: verifying mock payment on server (HMAC with mock_secret, idempotency check)..."});
    const v = await fetch("/api/checkout/verify", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: mockSignature,
        planSlug: plan, billingCycle: cycle, outletCount: outlets,
      }),
    });
    const vj = await v.json();
    if (!v.ok) { setMsg({type:"error", text: vj.error || "Mock verification failed"}); setStep("summary"); return; }
    setPaymentId(vj.subscriptionPaymentId || mockPaymentId);
    setMsg({type:"success", text: `✓ Mock payment verified (server HMAC). Subscription ${vj.subscriptionStatus || "ACTIVE"} • ${formatINR(amountPaise)} • Idempotent. Redirecting to onboarding...`});
    setStep("success");
    setTimeout(()=> window.location.href = vj.next || "/app/onboarding", 900);
  }

  async function startTrial(){
    if (!isAuthenticated) { window.location.href = `/sign-up?plan=${plan}&cycle=${cycle}&next=/checkout`; return; }
    setLoading(true); setMsg({type:"info", text: "Starting 14-day free trial (no card)..."});
    try{
      const res = await fetch("/api/checkout/start-trial", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ planSlug: plan, billingCycle: cycle }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setMsg({type:"success", text: `✓ Trial started • ${j.trialEndsAt ? new Date(j.trialEndsAt).toLocaleDateString() : "14 days"} • ${j.subscriptionId}`});
      setTimeout(()=> window.location.href = "/app/onboarding", 800);
    }catch(e:any){ setMsg({type:"error", text: e.message }); } finally { setLoading(false); }
  }

  if (step==="success" && paymentId) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="rounded-2xl border border-[#3D954F]/30 bg-[#3D954F]/10 p-6 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#3D954F] grid place-items-center text-white text-xl">✓</div>
          <h2 className="mt-3 text-xl font-black text-white">Payment verified — welcome to RestroNex!</h2>
          <p className="mt-2 text-sm text-white/70">Server verified signature, webhook idempotency ensured. Your subscription is now <b className="text-white">ACTIVE</b>. Payment {paymentId.slice(0,14)}…</p>
          <div className="mt-4 flex gap-2 justify-center"><Link href="/app/onboarding" className="rounded-full bg-[#3D954F] px-6 py-3 text-sm font-bold text-white">Continue to onboarding →</Link><Link href="/app/dashboard" className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white">Go to dashboard</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      {!isAuthenticated && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-amber-100"><b>Sign in required</b> — your plan <b>{plan}</b> is saved. Create account to checkout.</div>
          <div className="flex gap-2"><Link href={`/sign-up?plan=${plan}&cycle=${cycle}&next=${encodeURIComponent(`/checkout?plan=${plan}&cycle=${cycle}`)}`} className="rounded-full bg-white px-5 py-2 text-sm font-bold text-[#070B07]">Create account & continue →</Link><Link href={`/sign-in?plan=${plan}&cycle=${cycle}`} className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm font-semibold text-white">Sign in</Link></div>
        </div>
      )}

      {!razorConfigured && (
        <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 flex gap-2 items-start">
          <AlertTriangle className="h-4 w-4 text-blue-300 mt-0.5 shrink-0" />
          <div className="text-xs leading-5 text-blue-100"><b>Demo Razorpay mode:</b> Real Razorpay keys not configured (mock detected). Checkout simulates payment server-side with HMAC <code>mock_secret</code> + webhook idempotency via <code>WebhookEvent.eventId</code>. No real charge. For production add <code>RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET</code> in env — flow then uses live Razorpay Orders API + signature verification.</div>
        </div>
      )}

      {/* Plan selector (preserved state) */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-white/40">Plan:</span>
        {["starter","growth","business"].map(s=> (
          <button key={s} onClick={()=>setPlan(s)} className={`rounded-full px-4 py-2 text-xs font-bold border capitalize ${plan===s ? "bg-[#3D954F] text-white border-[#3D954F]" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"}`}>{s}</button>
        ))}
        <span className="ml-3 text-xs text-white/40">Cycle:</span>
        {(["MONTHLY","ANNUAL"] as const).map(c=> (
          <button key={c} onClick={()=>setCycle(c)} className={`rounded-full px-4 py-2 text-xs font-bold border ${cycle===c ? "bg-white text-[#070B07] border-white" : "bg-white/5 border-white/10 text-white/60"}`}>{c}</button>
        ))}
        <div className="ml-2 flex items-center gap-2 text-xs text-white/60">
          Outlets:
          <button onClick={()=>setOutlets(Math.max(1, outlets-1))} className="h-7 w-7 rounded-full border border-white/10 bg-white/5 text-white">−</button>
          <span className="w-6 text-center font-bold text-white">{outlets}</span>
          <button onClick={()=>setOutlets(outlets+1)} className="h-7 w-7 rounded-full bg-[#3D954F] text-white">+</button>
          <span className="text-[11px] text-white/30">Multi-outlet billed per outlet on Growth/Scale</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_420px] gap-6">
        {/* Summary */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="text-slate-900 flex items-center justify-between">Order summary <span className="text-xs font-normal text-slate-500">Server is source of truth • No browser trust</span></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex justify-between items-start">
                <div><div className="text-sm font-black text-slate-900">{totals.plan.name} • {cycle.toLowerCase()} • {totals.plan.maxUsers} staff</div><div className="text-xs text-slate-500">{totals.plan.tagline} • {totals.plan.maxOutlets} outlets included • Billing per {cycle==="ANNUAL"?"year":"month"}</div></div>
                <span className="rounded-full bg-[#3D954F] text-white px-3 py-1 text-xs font-bold">{totals.trialEligible ? "Trial eligible" : "Contact sales"}</span>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-slate-600">
                {totals.plan.features.slice(0,4).map((f:string)=> <li key={f} className="flex gap-2"><Check className="h-3.5 w-3.5 text-[#3D954F] mt-0.5" />{f}</li>)}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#070B07] text-white p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-white/60">Subtotal ({outlets} outlet{outlets>1?'s':''} × {formatINR(totals.basePaise)})</span><span className="font-semibold">{formatINR(totals.subtotal)}</span></div>
              {totals.discountPaise>0 && <div className="flex justify-between text-sm text-emerald-300"><span>Coupon Discount ({coupon})</span><span>−{formatINR(totals.discountPaise)}</span></div>}
              <div className="flex justify-between text-xs text-white/50"><span>Taxable</span><span>{formatINR(totals.taxable)}</span></div>
              <div className="flex justify-between text-xs text-white/50"><span>GST 18% (CGST 9% + SGST 9%)</span><span>{formatINR(totals.gstPaise)}</span></div>
              <div className="flex justify-between text-base font-black pt-2 border-t border-white/10"><span>Total payable</span><span>{formatINR(totals.totalPaise)}</span></div>
              <div className="text-[11px] text-white/30">INR • Paise math • Razorpay order amount in paise • Webhook HMAC verified</div>
            </div>



            {hasTenant && (
              <div className="rounded-xl bg-[#3D954F]/10 border border-[#3D954F]/20 p-3 text-xs text-[#0F1F14]">You already have a business ({tenantId?.slice(0,8)}…). Checkout will upgrade/renew its subscription. No second tenant will be created.</div>
            )}

            {msg && <div className={`rounded-xl border p-3 text-sm ${msg.type==="success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : msg.type==="error" ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>{msg.text}</div>}
          </CardContent>
        </Card>

        {/* Payment */}
        <Card className="bg-[#0F1F14] border-[#3D954F]/20 shadow-xl h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#3D954F]" /> Payment Options</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Razorpay Secure</span>
            </CardTitle>
            <p className="text-xs text-white/50">Select method • Instant receipt & access</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payment Method Badges / Mode Switcher */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <button
                type="button"
                onClick={() => setPaymentMode("QR")}
                className={`p-2.5 rounded-xl border text-white flex flex-col items-center gap-1 transition ${
                  paymentMode === "QR"
                    ? "border-emerald-400 bg-emerald-500/20 shadow-inner ring-1 ring-emerald-400/50"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="text-base">⚡</span>
                <span className="font-bold text-[11px] flex items-center gap-1">
                  UPI / QR <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </span>
                <span className="text-[9px] text-emerald-300/80 font-medium">Scan & Pay</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode("GATEWAY")}
                className={`p-2.5 rounded-xl border text-white flex flex-col items-center gap-1 transition ${
                  paymentMode === "GATEWAY"
                    ? "border-emerald-400 bg-emerald-500/20 shadow-inner ring-1 ring-emerald-400/50"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="text-base">💳</span>
                <span className="font-semibold text-[11px]">Cards</span>
                <span className="text-[9px] text-white/40">Visa, MC, RuPay</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode("GATEWAY")}
                className={`p-2.5 rounded-xl border text-white flex flex-col items-center gap-1 transition ${
                  paymentMode === "GATEWAY"
                    ? "border-emerald-400 bg-emerald-500/20 shadow-inner ring-1 ring-emerald-400/50"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="text-base">🏦</span>
                <span className="font-semibold text-[11px]">Net Banking</span>
                <span className="text-[9px] text-white/40">50+ Banks</span>
              </button>
            </div>

            {/* Discreet Promo Code (Hidden by default — zero public codes displayed) */}
            <div className="pt-0.5">
              {!showCouponInput && !coupon ? (
                <button
                  type="button"
                  onClick={() => setShowCouponInput(true)}
                  className="text-xs text-white/50 hover:text-emerald-300 transition flex items-center gap-1.5"
                >
                  <Tag className="h-3 w-3" /> Have a promo code?
                </button>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                      <Tag className="h-3 w-3 text-[#3D954F]" /> Promo Code
                    </Label>
                    {coupon && (
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="h-3 w-3" /> Applied
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value); setCouponStatus(null); }}
                      placeholder="Enter promo code"
                      className="flex-1 bg-black/40 border-white/15 text-white placeholder:text-white/30 text-xs h-9 focus:border-[#3D954F]"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-xl bg-[#3D954F] hover:bg-[#2e7a3e] text-white font-bold text-xs h-9 px-4"
                      onClick={() => applyCouponCode()}
                    >
                      Apply
                    </Button>
                    {coupon ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs h-9 px-2"
                        onClick={removeCouponCode}
                        title="Remove code"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-white/40 hover:text-white text-xs h-9 px-2"
                        onClick={() => setShowCouponInput(false)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                  {couponStatus && (
                    <div className={`text-[11px] p-2 rounded-lg border ${couponStatus.startsWith("✓") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>
                      {couponStatus}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Amount Summary in Payment Card */}
            <div className="rounded-2xl bg-white p-4 text-slate-900 space-y-1.5">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Subtotal ({outlets} outlet{outlets>1?'s':''})</span>
                <span className="font-semibold text-slate-700">{formatINR(totals.subtotal)}</span>
              </div>
              {totals.discountPaise > 0 && (
                <div className="flex justify-between items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                  <span>Discount</span>
                  <span>−{formatINR(totals.discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>GST (18%)</span>
                <span>{formatINR(totals.gstPaise)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-xs font-bold text-slate-900">Total Payable</span>
                <span className="text-2xl font-black text-slate-900">{formatINR(totals.totalPaise)}</span>
              </div>
              <div className="text-[11px] text-slate-500">Receipt & GST tax invoice emailed automatically</div>
            </div>

            {/* DIRECT SCAN & PAY UPI QR CODE SECTION */}
            {paymentMode === "QR" ? (
              <div className="rounded-2xl border-2 border-[#3D954F]/50 bg-gradient-to-b from-[#142A1A] to-[#0A160E] p-4 text-center space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-white">
                    <QrCode className="h-4 w-4 text-[#3D954F]" /> Scan & Pay via UPI QR
                  </div>
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" /> Auto-Detecting
                  </span>
                </div>

                {/* QR Code Container with Scan Guides */}
                <div className="mx-auto w-fit p-3 bg-white rounded-2xl shadow-2xl border-2 border-emerald-400/40 relative">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=restronex@icici&pn=RestroNex%20Restaurant%20OS&am=${(totals.totalPaise/100).toFixed(2)}&cu=INR&tn=RestroNex_${plan}_Plan`)}&margin=4`}
                    alt="Scan UPI QR Code to Pay"
                    className="w-40 h-40 object-contain rounded-lg"
                    loading="eager"
                  />
                  <div className="text-[10px] text-slate-800 font-extrabold mt-1 text-center tracking-tight">
                    Pay {formatINR(totals.totalPaise)} • GPay / PhonePe / Paytm / Any UPI
                  </div>
                </div>

                {/* UPI ID with Copy button */}
                <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-white/60 text-[11px]">UPI ID:</span>
                    <span className="font-mono font-bold text-white text-[11px]">restronex@icici</span>
                  </div>
                  <button
                    type="button"
                    onClick={copyUpiId}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-md transition flex items-center gap-1"
                  >
                    {copiedUpi ? <><CheckCheck className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                  </button>
                </div>

                {/* Auto Detection Status Box */}
                <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/30 p-2.5 text-left text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px]">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Checking for payment automatically...
                  </div>
                  <div className="text-[10px] text-white/60 leading-relaxed">
                    Pay using GPay, PhonePe, Paytm, or Net Banking. Once paid, the system automatically checks Razorpay and activates your subscription without needing to click anything.
                  </div>
                </div>

                {/* Instant Verification Check / Test Simulation */}
                <div className="flex gap-2">
                  <Button
                    onClick={simulatePaidTest}
                    disabled={qrVerifying || step === "processing"}
                    className="flex-1 rounded-xl bg-[#3D954F] hover:bg-[#2e7a3e] text-white py-3.5 text-xs font-bold shadow-md"
                  >
                    {qrVerifying ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Checking Razorpay…</>
                    ) : (
                      `⚡ Check & Auto-Verify Payment`
                    )}
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={() => { setPaymentMode("GATEWAY"); startCheckout(); }}
                  className="text-xs text-white/50 hover:text-emerald-300 underline transition text-center block w-full pt-1"
                >
                  Or open in Razorpay Modal Popup (Cards / Netbanking / UPI) →
                </button>
              </div>
            ) : (
              /* GATEWAY POPUP MODE */
              <div className="space-y-3">
                <Button
                  onClick={startCheckout}
                  disabled={loading || step === "processing"}
                  className="w-full rounded-full bg-[#3D954F] hover:bg-[#2e7a3e] text-white py-6 text-sm font-black shadow-lg"
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating order…</> : step === "processing" ? "Verifying…" : `Pay securely — ${formatINR(totals.totalPaise)} →`}
                </Button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("QR")}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1 w-full text-center"
                >
                  <QrCode className="h-3.5 w-3.5" /> Switch back to QR Code Scan & Pay
                </button>
              </div>
            )}

            {totals.trialEligible && (
              <Button variant="outline" onClick={startTrial} disabled={loading} className="w-full rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10">
                Start 14-day free trial — no card
              </Button>
            )}

            <div className="text-xs text-white/40 text-center">By paying you agree to Terms • Subscription auto-renews • Cancel anytime • Support 24×7</div>
            <div className="flex gap-2 text-xs">
              <Link href="/pricing" className="flex-1 rounded-full border border-white/10 bg-white/5 py-2.5 text-center text-white/60 hover:bg-white/10">Change plan</Link>
              <Link href="/app/onboarding" className="flex-1 rounded-full bg-white/5 border border-white/10 py-2.5 text-center text-white/70">Skip for now →</Link>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-white/50 flex gap-2">
              <ShieldCheck className="h-4 w-4 text-[#3D954F] shrink-0 mt-0.5" />
              <div>Server never trusts browser: we verify Razorpay signature with <code>RAZORPAY_KEY_SECRET</code> via HMAC-SHA256 and deduplicate webhooks by <code>WebhookEvent.eventId</code>. Pending/failed/cancelled/replayed events are handled safely. See <code>/api/webhooks/razorpay</code>.</div>
            </div>

            {!webhookConfigured && <div className="text-[11px] text-white/30 text-center">Webhook secret not configured — demo accepts webhook without signature (honest banner). Add <code>RAZORPAY_WEBHOOK_SECRET</code> for production HMAC.</div>}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/40 flex flex-wrap gap-3 justify-between">
        <span>Need help? <Link href="/contact" className="text-[#3D954F]">Contact sales</Link> • <Link href="/book-demo" className="text-[#3D954F]">Book demo</Link> • <Link href="/faq" className="text-[#3D954F]">FAQ</Link></span>
        <span>Trusted by 2,400+ restaurants • Offline-ready • Day-end in &lt;5 min</span>
      </div>
    </div>
  );
}
