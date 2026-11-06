"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatINR } from "@/lib/money";
import { calcCheckoutTotals } from "@/lib/checkout";
import { Check, Loader2, CreditCard, Tag, X, ShieldCheck, Zap, Lock } from "lucide-react";
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

export default function CheckoutClient({
  initialPlan,
  initialCycle,
  initialOutletCount,
  totals: initialTotals,
  isAuthenticated,
  tenantId,
  hasTenant,
  razorConfigured: _razorConfigured,
  webhookConfigured: _webhookConfigured,
}: Props) {
  const router = useRouter();
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
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Preload official Razorpay checkout script
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

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
      const payload = JSON.stringify({ planSlug: plan, billingCycle: cycle, outletCount: outlets });
      try{
        document.cookie = `restronex_checkout=${encodeURIComponent(payload)}; Path=/; Max-Age=${60*60*24*30}; SameSite=Lax`;
        document.cookie = `restronex_plan=${encodeURIComponent(plan)}; Path=/; Max-Age=${60*60*24*30}; SameSite=Lax`;
        document.cookie = `restronex_cycle=${cycle}; Path=/; Max-Age=${60*60*24*30}; SameSite=Lax`;
      }catch{}
      localStorage.setItem("restronex_checkout", payload);
    } catch(e:any){ setMsg({type:"error", text: e.message }); }
  }, [plan, cycle, outlets, coupon]);

  const ensureOrder = useCallback(async (): Promise<string | null> => {
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
  }, [activeOrderId, plan, cycle, outlets, coupon]);

  useEffect(() => {
    if (!isAuthenticated || step === "success") return;
    ensureOrder();

    const interval = setInterval(async () => {
      try {
        const checkRes = await fetch("/api/checkout/check-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planSlug: plan, billingCycle: cycle, outletCount: outlets }),
        });
        const cj = await checkRes.json();
        if (checkRes.ok && cj.paid) {
          clearInterval(interval);
          setPaymentId(cj.paymentId);
          setMsg({ type: "success", text: "✓ Payment detected & verified on Razorpay! Activating your subscription..." });
          setStep("success");
          setTimeout(() => { router.push(cj.next || "/app/onboarding"); }, 1500);
        }
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [isAuthenticated, plan, cycle, outlets, step, ensureOrder, router]);

  function applyCouponCode() {
    const raw = couponInput.trim();
    if (!raw) return;
    const res = computeCouponDiscount(raw, totals.subtotal);
    if (res.discountPaise > 0 || res.fixedTotalPaise !== undefined) {
      setCoupon(raw);
      setCouponStatus(`✓ Code applied: ${res.label}`);
    } else {
      setCouponStatus("✕ Invalid code or expired promotion");
    }
  }

  function removeCouponCode() {
    setCoupon("");
    setCouponInput("");
    setCouponStatus(null);
  }

  async function startCheckout(){
    if (!isAuthenticated) {
      router.push(`/sign-up?plan=${plan}&cycle=${cycle}&next=${encodeURIComponent(`/checkout?plan=${plan}&cycle=${cycle}&outlets=${outlets}`)}`);
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

      setMsg({type:"info", text: `Order ${j.orderId} created — amount ${formatINR(j.amountPaise)}. Opening Razorpay...`});

      if (!j.keyId) {
        throw new Error("Payment gateway is temporarily unavailable. Please retry or contact support.");
      }

      await openRazorpay(j.orderId, j.amountPaise, j.keyId);
    }catch(e:any){
      setMsg({type:"error", text: e.message});
    }finally{ setLoading(false); }
  }

  async function openRazorpay(orderId: string, amountPaise: number, keyId: string){
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
      handler: async function (response: any) {
        setStep("processing");
        setMsg({type:"info", text: "Verifying payment securely on server..."});
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
        setMsg({type:"success", text: `✓ Payment verified server-side. Subscription ${vj.subscriptionId} ACTIVE.`});
        setStep("success");
        setTimeout(()=> router.push(vj.next || "/app/onboarding"), 1200);
      },
      prefill: { name: "RestroNex User", email: "", contact: "" },
      theme: { color: "#16845B" },
      modal: { ondismiss: ()=> setMsg({type:"error", text:"Checkout dismissed. You can retry or use UPI QR."})},
    };
    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (r: any)=> {
      setMsg({type:"error", text: `Payment failed: ${r.error?.description || "Gateway error"}`});
    });
    rzp.open();
  }

  if (step==="success" && paymentId) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-8 text-center shadow-lg">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B] text-xl font-bold">✓</div>
          <h2 className="mt-4 text-2xl font-black text-[#172B25]">Payment verified — welcome to RestroNex!</h2>
          <p className="mt-2 text-sm text-[#718078]">Server verified signature, webhook idempotency ensured. Your subscription is now <b className="text-[#16845B]">ACTIVE</b>.</p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link href="/app/onboarding" className="rounded-full bg-[#16845B] px-6 py-3 text-sm font-bold text-white hover:bg-[#116B49] shadow-sm">
              Continue to onboarding →
            </Link>
            <Link href="/app/dashboard" className="rounded-full border border-[#E5EBE7] bg-white px-6 py-3 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9]">
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1120px] space-y-6 text-[#172B25]">
      {!isAuthenticated && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-amber-900"><b>Sign in required</b> — your plan <b>{plan}</b> is saved. Create account to checkout.</div>
          <div className="flex gap-2">
            <Link href={`/sign-up?plan=${plan}&cycle=${cycle}&next=${encodeURIComponent(`/checkout?plan=${plan}&cycle=${cycle}`)}`} className="rounded-full bg-[#16845B] px-5 py-2 text-sm font-bold text-white shadow-xs">Create account & continue →</Link>
            <Link href={`/sign-in?plan=${plan}&cycle=${cycle}`} className="rounded-full border border-[#E5EBE7] bg-white px-5 py-2 text-sm font-semibold text-[#172B25]">Sign in</Link>
          </div>
        </div>
      )}

      {/* Plan selector (preserved state) */}
      <div className="flex flex-wrap gap-2 items-center bg-white border border-[#E5EBE7] p-3 rounded-2xl shadow-xs">
        <span className="text-xs font-semibold text-[#718078]">Plan:</span>
        {["starter","growth","business"].map(s=> (
          <button
            key={s}
            onClick={()=>setPlan(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold border capitalize transition ${
              plan===s ? "bg-[#16845B] text-white border-[#16845B] shadow-xs" : "bg-[#F8FAF9] border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
            }`}
          >
            {s}
          </button>
        ))}
        <span className="ml-3 text-xs font-semibold text-[#718078]">Cycle:</span>
        {(["MONTHLY","ANNUAL"] as const).map(c=> (
          <button
            key={c}
            onClick={()=>setCycle(c)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold border transition ${
              cycle===c ? "bg-[#16845B] text-white border-[#16845B] shadow-xs" : "bg-[#F8FAF9] border-[#E5EBE7] text-[#718078]"
            }`}
          >
            {c}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs text-[#718078]">
          Outlets:
          <button onClick={()=>setOutlets(Math.max(1, outlets-1))} className="h-7 w-7 rounded-full border border-[#E5EBE7] bg-[#F8FAF9] text-[#172B25] hover:bg-[#E8F5EE]">−</button>
          <span className="w-6 text-center font-bold text-[#172B25]">{outlets}</span>
          <button onClick={()=>setOutlets(outlets+1)} className="h-7 w-7 rounded-full bg-[#16845B] text-white">+</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_420px] gap-6">
        {/* Summary */}
        <Card className="bg-white border-[#E5EBE7] shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#172B25] flex items-center justify-between">
              Order summary
              <span className="text-xs font-normal text-[#718078]">Server verified • GST 18%</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-base font-black text-[#172B25]">{totals.plan.name} • {cycle.toLowerCase()} • {totals.plan.maxUsers} staff</div>
                  <div className="text-xs text-[#718078] mt-0.5">{totals.plan.tagline} • {totals.plan.maxOutlets} outlets included</div>
                </div>
                <span className="rounded-full bg-[#E8F5EE] border border-[#E5EBE7] text-[#16845B] px-3 py-1 text-xs font-bold">
                  Instant Activation
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-xs text-[#718078]">
                {totals.plan.features.slice(0,4).map((f:string)=> (
                  <li key={f} className="flex gap-2 text-[#172B25]">
                    <Check className="h-4 w-4 text-[#16845B] shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-[#718078]">Subtotal ({outlets} outlet{outlets>1?'s':''} × {formatINR(totals.basePaise)})</span>
                <span className="font-semibold text-[#172B25]">{formatINR(totals.subtotal)}</span>
              </div>
              {totals.discountPaise>0 && (
                <div className="flex justify-between text-sm text-[#16845B] font-bold">
                  <span>Coupon Discount ({coupon})</span>
                  <span>−{formatINR(totals.discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-[#718078]">
                <span>Taxable Amount</span>
                <span className="text-[#172B25] font-medium">{formatINR(totals.taxable)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#718078]">
                <span>GST 18% (CGST 9% + SGST 9%)</span>
                <span className="text-[#172B25] font-medium">{formatINR(totals.gstPaise)}</span>
              </div>
              <div className="flex justify-between text-base font-black pt-2 border-t border-[#E5EBE7] text-[#172B25]">
                <span>Total payable</span>
                <span className="text-[#16845B]">{formatINR(totals.totalPaise)}</span>
              </div>
              <div className="text-[11px] text-[#718078]">INR • Paise math • Razorpay order amount in paise • Webhook HMAC verified</div>
            </div>

            {hasTenant && (
              <div className="rounded-xl bg-[#E8F5EE] border border-[#E5EBE7] p-3 text-xs text-[#16845B] font-medium">
                You already have a business ({tenantId?.slice(0,8)}…). Checkout will upgrade/renew its subscription.
              </div>
            )}

            {msg && (
              <div className={`rounded-xl border p-3 text-sm ${
                msg.type==="success" ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]" : msg.type==="error" ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"
              }`}>
                {msg.text}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Official Razorpay Payment Card */}
        <Card className="bg-white border-[#E5EBE7] shadow-sm h-fit lg:sticky lg:top-6">
          <CardHeader className="pb-3 border-b border-[#E5EBE7]">
            <CardTitle className="text-[#172B25] flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#16845B]" />
                Official Razorpay Checkout
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#16845B] bg-[#E8F5EE] border border-[#16845B]/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                RBI Verified
              </span>
            </CardTitle>
            <p className="text-xs text-[#718078] mt-1">
              Direct checkout via Razorpay official payment gateway
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Accepted Methods Banner */}
            <div className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-3.5 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078] flex items-center justify-between">
                <span>Accepted Payment Methods</span>
                <span className="text-[#16845B] font-semibold lowercase">all in 1 checkout</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-[#E5EBE7] bg-white p-2.5 flex items-center gap-2.5 shadow-2xs">
                  <div className="h-8 w-8 rounded-lg bg-[#E8F5EE] grid place-items-center text-sm font-black text-[#16845B] shrink-0">
                    ⚡
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#172B25] text-xs">UPI & QR</div>
                    <div className="text-[10px] text-[#718078] truncate">GPay, PhonePe, Paytm, CRED</div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E5EBE7] bg-white p-2.5 flex items-center gap-2.5 shadow-2xs">
                  <div className="h-8 w-8 rounded-lg bg-[#E8F5EE] grid place-items-center text-sm font-black text-[#16845B] shrink-0">
                    💳
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#172B25] text-xs">Debit & Credit</div>
                    <div className="text-[10px] text-[#718078] truncate">Visa, Mastercard, RuPay</div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E5EBE7] bg-white p-2.5 flex items-center gap-2.5 shadow-2xs">
                  <div className="h-8 w-8 rounded-lg bg-[#E8F5EE] grid place-items-center text-sm font-black text-[#16845B] shrink-0">
                    🏦
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#172B25] text-xs">Net Banking</div>
                    <div className="text-[10px] text-[#718078] truncate">50+ Indian Banks</div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E5EBE7] bg-white p-2.5 flex items-center gap-2.5 shadow-2xs">
                  <div className="h-8 w-8 rounded-lg bg-[#E8F5EE] grid place-items-center text-sm font-black text-[#16845B] shrink-0">
                    👛
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#172B25] text-xs">Wallets & EMI</div>
                    <div className="text-[10px] text-[#718078] truncate">Paytm, Mobikwik & more</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Promo Code */}
            <div className="pt-0.5">
              {!showCouponInput && !coupon ? (
                <button
                  type="button"
                  onClick={() => setShowCouponInput(true)}
                  className="text-xs text-[#718078] hover:text-[#16845B] transition flex items-center gap-1.5 font-medium"
                >
                  <Tag className="h-3 w-3" /> Have a promo code?
                </button>
              ) : (
                <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-[#172B25] flex items-center gap-1.5">
                      <Tag className="h-3 w-3 text-[#16845B]" /> Promo Code
                    </Label>
                    {coupon && (
                      <span className="text-[10px] font-bold text-[#16845B] bg-[#E8F5EE] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="h-3 w-3" /> Applied
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value); setCouponStatus(null); }}
                      placeholder="Enter promo code (e.g. PAY2, WELCOME10)"
                      className="flex-1 bg-white border-[#E5EBE7] text-[#172B25] text-xs h-9"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white font-bold text-xs h-9 px-4 cursor-pointer"
                      onClick={() => applyCouponCode()}
                    >
                      Apply
                    </Button>
                    {coupon ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-red-200 bg-red-50 text-red-600 text-xs h-9 px-2 cursor-pointer"
                        onClick={removeCouponCode}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-[#718078] text-xs h-9 px-2 cursor-pointer"
                        onClick={() => setShowCouponInput(false)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                  {couponStatus && (
                    <div className={`text-[11px] p-2 rounded-lg border ${couponStatus.startsWith("✓") ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]" : "bg-red-50 border-red-200 text-red-600"}`}>
                      {couponStatus}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Official Razorpay Pay Action */}
            <div className="space-y-3 pt-1">
              <Button
                onClick={startCheckout}
                disabled={loading || step === "processing"}
                className="w-full rounded-2xl bg-[#16845B] hover:bg-[#116B49] text-white py-6 text-sm font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Opening Razorpay Gateway…
                  </>
                ) : step === "processing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Verifying Payment…
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Pay {formatINR(totals.totalPaise)} via Razorpay →
                  </>
                )}
              </Button>
            </div>

            {/* Trust and Compliance Badges */}
            <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-3 space-y-2 text-center">
              <div className="flex items-center justify-center gap-3 text-[11px] font-semibold text-[#172B25]">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#16845B]" />
                  PCI-DSS Level 1
                </span>
                <span className="text-[#E5EBE7]">•</span>
                <span className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-[#16845B]" />
                  256-Bit SSL
                </span>
                <span className="text-[#E5EBE7]">•</span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-[#16845B]" />
                  Instant Activation
                </span>
              </div>
              <div className="text-[10px] text-[#718078]">
                Protected by Razorpay official payment infrastructure. GST invoice delivered instantly.
              </div>
            </div>

            <div className="text-[11px] text-[#718078] text-center pt-1">
              By paying you agree to Terms • Subscription auto-renews • Cancel anytime
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 text-xs text-[#718078] flex flex-wrap gap-3 justify-between shadow-xs">
        <span>Need help? <Link href="/contact" className="text-[#16845B] font-medium">Contact sales</Link> • <Link href="/book-demo" className="text-[#16845B] font-medium">Book demo</Link> • <Link href="/faq" className="text-[#16845B] font-medium">FAQ</Link></span>
        <span>Trusted by 2,400+ restaurants • Offline-ready</span>
      </div>
    </div>
  );
}
