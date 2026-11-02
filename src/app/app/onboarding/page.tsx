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
      <div className="max-w-4xl mx-auto p-12 text-center text-[#718078]">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#16845B] border-t-transparent mb-4" />
        <p className="text-sm font-medium">Synchronizing restaurant setup...</p>
      </div>
    );
  }

  const progressPct = Math.round(((step + 1) / steps.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5EBE7] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 text-[#16845B] text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive Setup Wizard</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#172B25]">
            {steps[step].name} Setup
          </h1>
          <p className="text-sm text-[#718078] mt-1">
            Step {step + 1} of 8 — {steps[step].desc}
          </p>
        </div>

        {tenantName && (
          <div className="flex items-center gap-3 bg-white border border-[#E5EBE7] px-4 py-2.5 rounded-2xl shadow-2xs">
            <div className="h-2.5 w-2.5 rounded-full bg-[#16845B] animate-pulse" />
            <div>
              <div className="text-xs font-bold text-[#172B25] uppercase tracking-wider">{tenantName}</div>
              <div className="text-[11px] text-[#16845B] font-semibold">
                {hasSubscription ? "Growth Subscription Active" : "Setup Mode"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold text-[#718078]">
          <span>Overall Onboarding Progress</span>
          <span className="text-[#16845B] font-bold">{progressPct}% Complete</span>
        </div>
        <div className="h-2.5 w-full bg-[#E5EBE7] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#16845B] transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Stepper Navigation */}
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
              className={`p-3 rounded-2xl text-left transition flex flex-col justify-between border cursor-pointer ${
                isCurrent
                  ? "bg-[#E8F5EE] border-2 border-[#16845B] text-[#16845B] shadow-2xs"
                  : isDone
                  ? "bg-white border-[#16845B]/30 hover:border-[#16845B]/60 text-[#172B25] shadow-2xs"
                  : "bg-white/60 border-[#E5EBE7] hover:bg-white text-[#718078]"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Icon
                  className={`h-4 w-4 ${
                    isCurrent
                      ? "text-[#16845B]"
                      : isDone
                      ? "text-[#16845B]"
                      : "text-[#718078]"
                  }`}
                />
                {isDone && <Check className="h-3.5 w-3.5 text-[#16845B] font-bold" />}
              </div>
              <div
                className={`text-xs font-bold truncate ${
                  isCurrent ? "text-[#16845B]" : isDone ? "text-[#172B25]" : "text-[#718078]"
                }`}
              >
                {s.name}
              </div>
              <div className="text-[10px] text-[#718078]">Step {i + 1}</div>
            </button>
          );
        })}
      </div>

      {/* Feedback Alert */}
      {msg && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-sm shadow-2xs ${
            msg.type === "success"
              ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {msg.type === "success" ? (
            <Check className="h-5 w-5 text-[#16845B] shrink-0" />
          ) : (
            <span className="text-red-600 font-bold">⚠️</span>
          )}
          <span className="font-medium">{msg.text}</span>
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
              <div className="rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#E8F5EE] text-[#16845B]">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-[#172B25] font-bold text-base">{tenantName}</h4>
                    <p className="text-xs text-[#718078]">
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
                  <Label>GSTIN Number (for GST tax invoices)</Label>
                  <Input
                    name="gstNumber"
                    placeholder="29ABCDE1234F1Z5"
                    defaultValue="29ABCDE1234F1Z5"
                  />
                </div>
                <Button type="submit" className="w-full py-3 text-base">
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
            <div className="rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E8F5EE] text-[#16845B] text-xs font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#16845B] animate-pulse" />
                    Operational Flagship
                  </div>
                  <h3 className="text-lg font-bold text-[#172B25] mt-1">Koramangala Main Branch</h3>
                  <p className="text-sm text-[#718078]">
                    Primary dining outlet configured with 12 dining tables across 3 areas.
                  </p>
                </div>
                <Badge variant="success">Active Branch</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-white border border-[#E5EBE7] text-center shadow-2xs">
                  <div className="text-2xl font-extrabold text-[#16845B]">12</div>
                  <div className="text-xs font-medium text-[#718078] mt-0.5">Dining Tables</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-[#E5EBE7] text-center shadow-2xs">
                  <div className="text-2xl font-extrabold text-[#16845B]">3</div>
                  <div className="text-xs font-medium text-[#718078] mt-0.5">Floor Areas</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-[#E5EBE7] text-center shadow-2xs">
                  <div className="text-2xl font-extrabold text-[#16845B]">Multi-KDS</div>
                  <div className="text-xs font-medium text-[#718078] mt-0.5">Kitchen Stations</div>
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
            <div className="rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-white border border-[#E5EBE7] space-y-1 shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#718078] uppercase">Zone 1</span>
                  <div className="text-[#172B25] font-bold">Main Dining Hall</div>
                  <div className="text-xs font-semibold text-[#16845B]">6 Tables (T1 – T6)</div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E5EBE7] space-y-1 shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#718078] uppercase">Zone 2</span>
                  <div className="text-[#172B25] font-bold">Rooftop Terrace</div>
                  <div className="text-xs font-semibold text-[#16845B]">3 Tables (T7 – T9)</div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E5EBE7] space-y-1 shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#718078] uppercase">Zone 3</span>
                  <div className="text-[#172B25] font-bold">AC Family Lounge</div>
                  <div className="text-xs font-semibold text-[#16845B]">3 Tables (T10 – T12)</div>
                </div>
              </div>
              <p className="text-xs text-[#718078]">
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
            <div className="rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] p-5 space-y-3">
              <h4 className="text-xs font-bold text-[#172B25] uppercase tracking-wider">
                Pre-configured Catalog Sample
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white border border-[#E5EBE7] flex justify-between items-center shadow-2xs">
                  <div>
                    <span className="font-bold text-[#172B25]">Woodfired Margherita Pizza</span>
                    <span className="block text-[#718078]">Italian Mains • 10&quot; Hand-tossed</span>
                  </div>
                  <span className="text-[#16845B] font-extrabold text-sm">₹299.00</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-[#E5EBE7] flex justify-between items-center shadow-2xs">
                  <div>
                    <span className="font-bold text-[#172B25]">Artisanal Cold Brew Coffee</span>
                    <span className="block text-[#718078]">Beverages • 250ml</span>
                  </div>
                  <span className="text-[#16845B] font-extrabold text-sm">₹149.00</span>
                </div>
              </div>
              <p className="text-xs text-[#718078]">
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
            <div className="rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-white border border-[#E5EBE7] shadow-2xs">
                  <div className="text-xs font-semibold text-[#718078] uppercase">Central GST (CGST)</div>
                  <div className="text-2xl font-extrabold text-[#172B25] mt-1">9.0%</div>
                  <div className="text-[11px] text-[#718078]">900 basis points</div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E5EBE7] shadow-2xs">
                  <div className="text-xs font-semibold text-[#718078] uppercase">State GST (SGST)</div>
                  <div className="text-2xl font-extrabold text-[#172B25] mt-1">9.0%</div>
                  <div className="text-[11px] text-[#718078]">900 basis points</div>
                </div>
              </div>
              <p className="text-xs text-[#718078]">
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
            <div className="rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] p-5 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {["Owner / Admin", "Branch Manager", "Cashier / POS", "Kitchen / Chef", "Server / Waiter", "Inventory Lead", "Accounts", "Auditor"].map(
                  (role) => (
                    <div
                      key={role}
                      className="p-3 rounded-xl bg-white border border-[#E5EBE7] text-[#172B25] font-semibold text-center shadow-2xs"
                    >
                      {role}
                    </div>
                  )
                )}
              </div>
              <p className="text-xs text-[#718078]">
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
            <div className="rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-[#718078] font-bold">
                    Current Plan
                  </span>
                  <h3 className="text-xl font-extrabold text-[#172B25] mt-0.5">
                    {hasSubscription ? "Growth Plan (₹300 / month)" : "Starter Plan"}
                  </h3>
                </div>
                <Badge variant={hasSubscription ? "success" : "default"}>
                  {hasSubscription ? "Active & Verified" : "Active"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white border border-[#E5EBE7] text-[#172B25] font-medium shadow-2xs">
                  ✓ Up to 5 Outlets
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-[#E5EBE7] text-[#172B25] font-medium shadow-2xs">
                  ✓ 25 Staff Accounts
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-[#E5EBE7] text-[#172B25] font-medium shadow-2xs">
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
            <div className="rounded-2xl bg-[#E8F5EE] border border-[#16845B]/20 p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-[#16845B] text-white flex items-center justify-center shadow-xs">
                <Rocket className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-[#172B25]">System Ready for Live Service</h3>
              <p className="text-sm text-[#718078] leading-relaxed">
                Business profile, main outlet, tables, menu, GST settings, and Razorpay billing are active and synchronized.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Link href="/app/pos" className="w-full">
                <Button className="w-full py-4 text-sm font-bold bg-[#16845B] hover:bg-[#116B49] shadow-xs">
                  Open POS Billing
                </Button>
              </Link>
              <Link href="/app/kitchen" className="w-full">
                <Button variant="outline" className="w-full py-4 text-sm font-semibold">
                  Kitchen Display (KDS)
                </Button>
              </Link>
              <Link href="/app/dashboard" className="w-full">
                <Button variant="outline" className="w-full py-4 text-sm font-semibold">
                  Main Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Navigation Bar */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 flex items-center justify-between shadow-2xs">
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

        <span className="text-xs text-[#718078] font-semibold">
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
