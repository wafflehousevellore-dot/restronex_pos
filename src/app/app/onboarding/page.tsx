"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Store,
  MapPin,
  UtensilsCrossed,
  Receipt,
  Users,
  CreditCard,
  Rocket,
  Grid3X3,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const steps = [
  { name: "Business", icon: Store, desc: "Legal entity & brand identity" },
  { name: "Outlet", icon: MapPin, desc: "Primary dining & branch location" },
  { name: "Tables", icon: Grid3X3, desc: "Floor zones & table seating" },
  { name: "Menu", icon: UtensilsCrossed, desc: "Categories, dishes & variants" },
  { name: "Tax & GST", icon: Receipt, desc: "GST rules & receipt headers" },
  { name: "Staff", icon: Users, desc: "Team roles & POS permissions" },
  { name: "Plan", icon: CreditCard, desc: "Active subscription & billing" },
  { name: "Launch", icon: Rocket, desc: "Open POS & start service" },
] as const;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);

  async function saveProgress(newStep: number, complete = false) {
    setStep(newStep);
    setMsg(null);
    if (tenantId) {
      try {
        await apiFetch("/api/onboarding/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId, step: newStep, complete }),
        });
      } catch {}
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const p = await apiFetch("/api/onboarding/progress").then((r) => r.json());
        if (p.tenantId) {
          setTenantId(p.tenantId);
          setTenantName(p.name);
          setStep(p.onboardingStep || 0);
          if (p.onboardingComplete) {
            setMsg({
              type: "success",
              text: `Welcome back — your restaurant onboarding for ${p.name} is complete!`,
            });
          }
        }
        if (p.tenantId) {
          const sub = await apiFetch(`/api/subscription/status?tenantId=${p.tenantId}`)
            .then((r) => r.json())
            .catch(() => null);
          if (sub?.hasActiveSubscription) setHasSubscription(true);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  async function createBusiness(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await apiFetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (res.ok) {
      setTenantId(j.tenantId);
      setTenantName((body.name as string) || j.slug);
      setMsg({ type: "success", text: "Business profile created successfully!" });
      document.cookie = `restronex_org=${j.tenantId}; Path=/; SameSite=Lax`;
      await saveProgress(1);
    } else {
      setMsg({ type: "error", text: j.error || "Failed to create business" });
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-slate-400">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mb-4" />
        <p className="text-sm font-medium">Synchronizing restaurant setup...</p>
      </div>
    );
  }

  const progressPct = Math.round(((step + 1) / steps.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive Restaurant Setup</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {steps[step].name} Setup
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Step {step + 1} of 8 — {steps[step].desc}
          </p>
        </div>

        {tenantName && (
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">{tenantName}</div>
              <div className="text-[11px] text-emerald-400 font-medium">
                {hasSubscription ? "Growth Subscription Active" : "Setup Mode"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-medium text-slate-400">
          <span>Overall Onboarding Progress</span>
          <span className="text-emerald-400 font-bold">{progressPct}% Complete</span>
        </div>
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Step Stepper Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {steps.map((s, i) => {
          const isDone = i < step;
          const isCurrent = i === step;
          const Icon = s.icon;
          return (
            <button
              key={s.name}
              onClick={() => {
                if (tenantId || i === 0) saveProgress(i);
              }}
              className={`p-2.5 rounded-xl text-left transition flex flex-col justify-between border cursor-pointer ${
                isCurrent
                  ? "bg-emerald-950/40 border-emerald-500/80 shadow-md shadow-emerald-950/50"
                  : isDone
                  ? "bg-slate-900/60 border-emerald-500/30 hover:border-emerald-500/50 text-slate-300"
                  : "bg-slate-900/30 border-slate-800/80 hover:bg-slate-900/60 text-slate-500"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Icon
                  className={`h-4 w-4 ${
                    isCurrent
                      ? "text-emerald-400"
                      : isDone
                      ? "text-emerald-500"
                      : "text-slate-500"
                  }`}
                />
                {isDone && <Check className="h-3.5 w-3.5 text-emerald-400 font-bold" />}
              </div>
              <div className="text-xs font-bold truncate text-white">{s.name}</div>
              <div className="text-[10px] text-slate-400">Step {i + 1}</div>
            </button>
          );
        })}
      </div>

      {/* Feedback Alert */}
      {msg && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
            msg.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
              : "bg-rose-950/40 border-rose-500/30 text-rose-200"
          }`}
        >
          {msg.type === "success" ? (
            <Check className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <span className="text-rose-400">⚠️</span>
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* STEP 1: BUSINESS PROFILE */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1 — Restaurant Business Profile</CardTitle>
            <CardDescription>
              Configure your primary restaurant brand, legal identity, and GSTIN for automated billing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {tenantId ? (
              <div className="rounded-xl bg-slate-950/80 border border-emerald-500/30 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">{tenantName}</h4>
                    <p className="text-xs text-slate-400">
                      Primary restaurant entity is registered and active.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={() => saveProgress(1)}>
                    Proceed to Outlet Configuration →
                  </Button>
                  <Link href="/app/organization">
                    <Button variant="outline">Edit Organization Details</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={createBusiness} className="space-y-4">
                <div>
                  <Label>Restaurant Business Name *</Label>
                  <Input
                    name="name"
                    required
                    placeholder="e.g. Spice Route Bistro"
                    defaultValue="Spice Route Bistro"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Business Type</Label>
                    <Input name="businessType" defaultValue="Fine Dining & Bar" />
                  </div>
                  <div>
                    <Label>Official Contact Phone</Label>
                    <Input name="phone" defaultValue="+91 98765 43210" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Business Email</Label>
                    <Input name="email" placeholder="owner@spiceroute.com" />
                  </div>
                  <div>
                    <Label>Operating City</Label>
                    <Input name="city" defaultValue="Bengaluru" />
                  </div>
                </div>
                <div>
                  <Label>Registered Street Address</Label>
                  <Input name="address" defaultValue="80 Feet Road, Koramangala, Bengaluru" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Country</Label>
                    <Input name="country" defaultValue="IN" />
                  </div>
                  <div>
                    <Label>Time Zone</Label>
                    <Input name="timeZone" defaultValue="Asia/Kolkata" />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Input name="currency" defaultValue="INR" />
                  </div>
                </div>
                <div>
                  <Label>GSTIN Number (for GST compliance)</Label>
                  <Input
                    name="gstNumber"
                    placeholder="29ABCDE1234F1Z5"
                    defaultValue="29ABCDE1234F1Z5"
                  />
                </div>
                <Button type="submit" className="w-full py-3">
                  Create Business & Continue →
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 2: FIRST OUTLET */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2 — Primary Outlet & Branch Setup</CardTitle>
            <CardDescription>
              Each outlet operates independent POS billing, kitchen stations, and inventory tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Operational Flagship
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">Koramangala Main Branch</h3>
                  <p className="text-sm text-slate-400">
                    Primary dining outlet configured with 12 dining tables across 3 areas.
                  </p>
                </div>
                <Badge variant="success">Active Branch</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-center">
                  <div className="text-xl font-bold text-emerald-400">12</div>
                  <div className="text-xs text-slate-400 mt-0.5">Dining Tables</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-center">
                  <div className="text-xl font-bold text-emerald-400">3</div>
                  <div className="text-xs text-slate-400 mt-0.5">Floor Areas</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-center">
                  <div className="text-xl font-bold text-emerald-400">Multi-KDS</div>
                  <div className="text-xs text-slate-400 mt-0.5">Kitchen Station</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => saveProgress(2)}>
                Continue to Tables (Step 3) →
              </Button>
              <Button variant="outline" onClick={() => saveProgress(2)}>
                Skip for now
              </Button>
              <Link href="/app/outlets">
                <Button variant="outline">
                  Manage Outlets & Locations
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: TABLES & FLOOR */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3 — Floor Layout & Tables</CardTitle>
            <CardDescription>
              Table floor maps support instant status switching (Available ➔ Occupied ➔ Billed ➔ Reserved).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Zone 1</span>
                  <div className="text-white font-bold">Main Hall</div>
                  <div className="text-xs text-emerald-400">6 Tables (T1 – T6)</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Zone 2</span>
                  <div className="text-white font-bold">Rooftop Terrace</div>
                  <div className="text-xs text-emerald-400">3 Tables (T7 – T9)</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Zone 3</span>
                  <div className="text-white font-bold">AC Family Lounge</div>
                  <div className="text-xs text-emerald-400">3 Tables (T10 – T12)</div>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Each table features unique QR ordering codes, split billing, and order merging support.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => saveProgress(3)}>
                Continue to Menu (Step 4) →
              </Button>
              <Button variant="outline" onClick={() => saveProgress(3)}>
                Skip
              </Button>
              <Link href="/app/tables">
                <Button variant="outline">Open Floor Plan Editor</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: MENU SETUP */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4 — Menu & Dish Catalog</CardTitle>
            <CardDescription>
              Categories, portions, custom modifiers, and precision pricing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-5 space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Pre-configured Catalog Sample
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-white">Woodfired Margherita Pizza</span>
                    <span className="block text-slate-400">Italian Mains • 10&quot; Hand-tossed</span>
                  </div>
                  <span className="text-emerald-400 font-bold">₹299.00</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-white">Artisanal Cold Brew Coffee</span>
                    <span className="block text-slate-400">Beverages • 250ml</span>
                  </div>
                  <span className="text-emerald-400 font-bold">₹149.00</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                You can import CSV menus, define custom modifiers (extra cheese, spice levels), and set channel prices anytime.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => saveProgress(4)}>
                Continue to Tax Rules (Step 5) →
              </Button>
              <Button variant="outline" onClick={() => saveProgress(4)}>
                Skip
              </Button>
              <Link href="/app/menu">
                <Button variant="outline">Manage Menu Items</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 5: TAX & GST */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 5 — Tax & Compliance Settings</CardTitle>
            <CardDescription>
              Automated Indian GST computation with precision rounding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-xs text-slate-400">Central GST (CGST)</div>
                  <div className="text-lg font-bold text-white mt-1">9.0%</div>
                  <div className="text-[11px] text-slate-400">900 basis points</div>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-xs text-slate-400">State GST (SGST)</div>
                  <div className="text-lg font-bold text-white mt-1">9.0%</div>
                  <div className="text-[11px] text-slate-400">900 basis points</div>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                All bills automatically calculate statutory 18% GST with split line items for customer transparency.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => saveProgress(5)}>
                Continue to Staff Roles (Step 6) →
              </Button>
              <Link href="/app/settings">
                <Button variant="outline">Configure Receipts & Taxes</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 6: STAFF & ROLES */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 6 — Staff Roles & Permissions</CardTitle>
            <CardDescription>
              Role-Based Access Control (RBAC) across POS, Kitchen, and Management.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-5 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {["Owner / Admin", "Branch Manager", "Cashier / POS", "Kitchen / Chef", "Server / Waiter", "Inventory Lead", "Accounts", "Auditor"].map(
                  (role) => (
                    <div
                      key={role}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-slate-200 font-medium text-center"
                    >
                      {role}
                    </div>
                  )
                )}
              </div>
              <p className="text-xs text-slate-400">
                Staff can be invited via email or assigned numeric PINs for rapid POS terminal switching.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => saveProgress(6)}>
                Continue to Subscription Plan (Step 7) →
              </Button>
              <Button variant="outline" onClick={() => saveProgress(6)}>
                Skip for now
              </Button>
              <Link href="/app/staff">
                <Button variant="outline">Invite Team Members</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 7: PLAN & BILLING */}
      {step === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 7 — Subscription Plan & Billing</CardTitle>
            <CardDescription>
              Verified SaaS plan entitlements and automated renewal billing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    Current Plan
                  </span>
                  <h3 className="text-xl font-bold text-white mt-0.5">
                    {hasSubscription ? "Growth Plan (₹300 / month)" : "Starter Plan"}
                  </h3>
                </div>
                <Badge variant={hasSubscription ? "success" : "default"}>
                  {hasSubscription ? "Active & Verified" : "Active"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                  ✓ Up to 5 Outlets
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                  ✓ 25 Staff Accounts
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                  ✓ Full KDS & Inventory
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => saveProgress(7)}>
                Proceed to Launch (Step 8) →
              </Button>
              <Link href="/pricing">
                <Button variant="outline">View All Plans</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 8: LAUNCH */}
      {step === 7 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 8 — Launch Restaurant Operations 🚀</CardTitle>
            <CardDescription>
              Your restaurant is fully provisioned and ready to process live customer orders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-950 border border-emerald-500/30 p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Rocket className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">System Ready for Live Service</h3>
              <p className="text-sm text-slate-300">
                Business profile, main outlet, tables, menu, GST settings, and Razorpay billing are active and synchronized.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Link href="/app/pos" className="w-full">
                <Button className="w-full py-4 text-sm font-bold bg-emerald-600 hover:bg-emerald-500">
                  Open POS Billing
                </Button>
              </Link>
              <Link href="/app/kitchen" className="w-full">
                <Button variant="outline" className="w-full py-4 text-sm">
                  Open Kitchen Display (KDS)
                </Button>
              </Link>
              <Link href="/app/dashboard" className="w-full">
                <Button variant="outline" className="w-full py-4 text-sm">
                  Go to Main Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Navigation Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => saveProgress(Math.max(0, step - 1))}
          disabled={step === 0}
          className="text-xs"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous Step
        </Button>

        <span className="text-xs text-slate-400 font-medium">
          Step {step + 1} of 8
        </span>

        <Button
          size="sm"
          onClick={() => saveProgress(Math.min(7, step + 1))}
          disabled={step === 7}
          className="text-xs"
        >
          Next Step
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
