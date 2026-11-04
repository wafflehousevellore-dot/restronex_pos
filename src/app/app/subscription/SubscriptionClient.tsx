"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import Link from "next/link";
import {
  ShieldCheck,
  Check,
  Clock,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  Zap,
  CreditCard,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function SubscriptionClient() {
  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [renewing, setRenewing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Preload Razorpay checkout script
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [resSub, resPlans] = await Promise.all([
        fetch("/api/subscription/status"),
        fetch("/api/subscription-plans"),
      ]);

      if (resSub.ok) {
        const j = await resSub.json();
        setSubData(j);
      }

      if (resPlans.ok) {
        const p = await resPlans.json();
        setPlans(p);
      }
    } catch (err) {
      console.error("Failed to load subscription status:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleManualRenew() {
    setRenewing(true);
    setActionMsg(null);

    try {
      const res = await fetch("/api/subscription/manual-renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingCycle: subData?.subscription?.billingCycle || "MONTHLY" }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to initiate renewal");

      // Launch official Razorpay standard checkout
      if (window.Razorpay) {
        const options = {
          key: j.keyId,
          amount: j.amountPaise,
          currency: j.currency || "INR",
          name: "RestroNex Restaurant OS",
          description: `Subscription Renewal • ${j.plan.name} (${j.plan.billingCycle})`,
          order_id: j.orderId,
          handler: async function (response: any) {
            setActionMsg({ type: "success", text: "Verifying payment with server..." });
            const vRes = await fetch("/api/checkout/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planSlug: j.plan.slug,
                billingCycle: j.plan.billingCycle,
              }),
            });
            const vj = await vRes.json();
            if (vRes.ok) {
              setActionMsg({ type: "success", text: "✓ Subscription renewed successfully! Period extended." });
              loadData();
            } else {
              setActionMsg({ type: "error", text: vj.error || "Payment verification failed" });
            }
          },
          theme: { color: "#16845B" },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        window.location.href = `/checkout?plan=${j.plan.slug}`;
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setRenewing(false);
    }
  }

  async function handleCancelSubscription() {
    if (!confirm("Are you sure you want to cancel? Your restaurant will retain access until the end of your billing cycle.")) return;

    setCancelling(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Cancellation failed");

      setActionMsg({ type: "success", text: j.message });
      loadData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setCancelling(false);
    }
  }

  const ent = subData?.entitlements;
  const sub = subData?.subscription;

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Subscription & Plan Entitlements</h1>
          <p className="text-sm text-[#718078]">
            Server-enforced SaaS billing, active plan allowances, and manual renewal management.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/checkout">
            <Button className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold shadow-xs">
              Open Checkout →
            </Button>
          </Link>
        </div>
      </div>

      {actionMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold border ${
            actionMsg.type === "success"
              ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {actionMsg.text}
        </div>
      )}

      {/* Active Subscription Status Banner */}
      {sub && ent ? (
        <Card className="bg-white border-[#E5EBE7] shadow-sm">
          <CardHeader className="border-b border-[#E5EBE7] pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-black text-[#172B25] flex items-center gap-2">
                    <span>{ent.plan?.name || "Standard"} Plan</span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                        ent.status === "ACTIVE"
                          ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
                          : ent.status === "TRIALING"
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : ent.status === "PAST_DUE"
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-red-50 border-red-200 text-red-600"
                      }`}
                    >
                      {ent.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#718078] mt-0.5">
                    Billed {ent.billingCycle?.toLowerCase()} • {ent.daysRemaining} days remaining in current period
                  </div>
                </div>
              </div>

              {/* Renewal / Cancel Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleManualRenew}
                  disabled={renewing}
                  className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-4 h-9 shadow-xs cursor-pointer"
                >
                  {renewing ? "Connecting..." : "Renew Subscription (One-Time)"}
                </Button>
                {!sub.cancelAtPeriodEnd && (
                  <Button
                    variant="outline"
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold h-9"
                  >
                    Cancel Plan
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 grid sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#E5EBE7]">
              <div className="text-[#718078] font-medium">Period End Date</div>
              <div className="text-sm font-bold text-[#172B25] mt-1">
                {new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN", {
                  dateStyle: "long",
                })}
              </div>
              {sub.cancelAtPeriodEnd && (
                <div className="text-[11px] text-amber-700 font-bold mt-1">
                  Access active until period end. Will not renew.
                </div>
              )}
            </div>

            <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#E5EBE7]">
              <div className="text-[#718078] font-medium">Outlet Allowance</div>
              <div className="text-sm font-bold text-[#172B25] mt-1">
                {ent.currentOutletsCount} / {ent.plan?.maxOutlets} Outlets registered
              </div>
              <div className="text-[11px] text-[#16845B] font-semibold mt-1">
                {ent.canAddOutlet ? "✓ Can add more outlets" : "Max outlet capacity reached"}
              </div>
            </div>

            <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#E5EBE7]">
              <div className="text-[#718078] font-medium">Staff Account Allowance</div>
              <div className="text-sm font-bold text-[#172B25] mt-1">
                {ent.currentStaffCount} / {ent.plan?.maxUsers} Staff accounts
              </div>
              <div className="text-[11px] text-[#16845B] font-semibold mt-1">
                {ent.canAddStaff ? "✓ Can add staff members" : "Max staff capacity reached"}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-6 text-center bg-white border-[#E5EBE7]">
          <div className="text-sm text-[#718078]">No active subscription found. Choose a plan below to activate.</div>
        </Card>
      )}

      {/* Plans Selection Grid */}
      <div>
        <h2 className="text-base font-black text-[#172B25] mb-3">Available SaaS Subscription Tiers</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {plans.map((p: any) => {
            const isCurrentPlan = sub?.plan?.id === p.id;
            const isFeatured = p.slug === "growth";

            let features: string[] = [];
            try {
              features = JSON.parse(p.featuresJson || "[]");
            } catch {
              features = [];
            }

            return (
              <Card
                key={p.id}
                className={`bg-white border transition shadow-xs flex flex-col justify-between ${
                  isCurrentPlan
                    ? "border-2 border-[#16845B] ring-4 ring-[#16845B]/10 relative"
                    : "border-[#E5EBE7] hover:shadow-sm"
                }`}
              >
                <div>
                  <CardHeader>
                    {isCurrentPlan && (
                      <span className="w-fit text-[10px] font-bold text-[#16845B] bg-[#E8F5EE] border border-[#16845B]/20 px-2 py-0.5 rounded-full mb-2">
                        CURRENT ACTIVE PLAN
                      </span>
                    )}
                    <CardTitle className="text-lg text-[#172B25]">{p.name}</CardTitle>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-[#172B25]">{formatINR(p.priceMonthlyPaise)}</span>
                      <span className="text-xs text-[#718078]">/month</span>
                    </div>
                    <div className="text-[11px] text-[#718078] mt-0.5">
                      {p.maxOutlets} outlet{p.maxOutlets > 1 ? "s" : ""} • {p.maxUsers} staff accounts
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    {features.slice(0, 4).map((f: string) => (
                      <div key={f} className="flex items-center gap-2 text-[#718078]">
                        <Check className="h-3.5 w-3.5 text-[#16845B] shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </CardContent>
                </div>

                <div className="p-6 pt-0">
                  <Link href={`/checkout?plan=${p.slug}`}>
                    <Button
                      className={`w-full rounded-xl text-xs font-bold py-2.5 transition ${
                        isCurrentPlan
                          ? "bg-[#16845B] text-white shadow-xs"
                          : "border border-[#E5EBE7] bg-[#F8FAF9] text-[#172B25] hover:bg-white"
                      }`}
                    >
                      {isCurrentPlan ? "Renew or Manage" : `Switch to ${p.name}`}
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Payment History Table */}
      {sub?.payments && sub.payments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-black text-[#172B25]">Subscription Billing History</h2>
          <Card className="bg-white border-[#E5EBE7] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[#718078] font-bold">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EBE7]">
                  {sub.payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-[#F8FAF9] transition">
                      <td className="py-3.5 px-4 font-bold text-[#172B25] font-mono">
                        {p.invoiceNumber || p.id.slice(0, 10)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#16845B]">
                        {formatINR(p.amountPaise)}
                      </td>
                      <td className="py-3.5 px-4 uppercase font-semibold text-[#718078]">
                        {p.provider}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#718078]">
                        {p.razorpayOrderId || p.providerPaymentId || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === "COMPLETED"
                              ? "bg-[#E8F5EE] text-[#16845B]"
                              : p.status === "PENDING"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#718078]">
                        {new Date(p.createdAt).toLocaleDateString("en-IN", {
                          dateStyle: "medium",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

