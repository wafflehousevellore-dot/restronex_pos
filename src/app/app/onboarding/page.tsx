"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Store,
  MapPin,
  UtensilsCrossed,
  Receipt,
  Users,
  Rocket,
  Printer,
  MessageSquare,
  LayoutGrid,
  Bluetooth,
  Usb,
  Check,
  ChevronLeft,
  ShieldCheck,
  Building2,
  Loader2,
  FileCheck,
  Play,
} from "lucide-react";
import Link from "next/link";
import { discoverBluetoothPrinter, discoverUsbPrinter, dispatchClientPrintJob } from "@/lib/client-print";
import MetaWhatsAppConnectCard, { type WhatsAppConfigResponse } from "@/components/app/MetaWhatsAppConnectCard";

const ONBOARDING_STEPS = [
  { id: 1, name: "Business", icon: Store, title: "Business Information", desc: "Legal entity & brand identity", optional: false },
  { id: 2, name: "Address", icon: MapPin, title: "Business Address", desc: "Registered address & location", optional: false },
  { id: 3, name: "Outlet", icon: Building2, title: "Outlet Setup", desc: "Branch name, hours & service modes", optional: false },
  { id: 4, name: "Tax & Billing", icon: Receipt, title: "Tax & Billing Settings", desc: "GSTIN, receipt header & tax rates", optional: false },
  { id: 5, name: "Menu", icon: UtensilsCrossed, title: "Menu Setup", desc: "Categories, products & pricing", optional: false },
  { id: 6, name: "Staff", icon: Users, title: "Staff Setup", desc: "Team roles & cashier access", optional: false },
  { id: 7, name: "WhatsApp", icon: MessageSquare, title: "Connect WhatsApp Business", desc: "Automatically send invoices and order notifications to your customers.", optional: true },
  { id: 8, name: "Printer", icon: Printer, title: "Connect Your Receipt Printer", desc: "Automatic silent bill printing (58mm / 80mm thermal)", optional: true },
  { id: 9, name: "Tables & KOT", icon: LayoutGrid, title: "Tables & Kitchen Setup", desc: "Floor seating & KOT routing", optional: false },
  { id: 10, name: "Launch", icon: Rocket, title: "Final Review", desc: "Verify setup & activate POS", optional: false },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [tenantData, setTenantData] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);

  // Form states for all 8 steps
  const [step1, setStep1] = useState({ name: "", businessType: "Casual Dine", phone: "", email: "" });
  const [step2, setStep2] = useState({ address: "", city: "", state: "Karnataka", pincode: "", country: "IN" });
  const [step3, setStep3] = useState({
    outletName: "",
    outletAddress: "",
    outletCity: "",
    outletPhone: "",
    serviceModes: ["DINE_IN", "TAKEAWAY", "DELIVERY"],
    openingHours: "10:00 AM - 11:00 PM",
  });
  const [step4, setStep4] = useState({
    gstNumber: "",
    fssaiNumber: "",
    receiptHeader: "",
    receiptFooter: "Thank you for dining with us! Visit again.",
    serviceChargePct: 0,
    cgstRate: 900,
    sgstRate: 900,
  });
  const [step5Categories, setStep5Categories] = useState([
    { name: "Pizzas & Mains", items: [{ name: "Margherita Pizza", price: 299, isVeg: true, description: "Classic tomato & cheese" }] },
    { name: "Beverages", items: [{ name: "Fresh Lime Soda", price: 99, isVeg: true, description: "Sweet & salty refreshing cooler" }] },
  ]);
  const [step6Staff, setStep6Staff] = useState([
    { name: "Shift Cashier", email: "cashier@restaurant.local", role: "CASHIER" },
  ]);
  const [step7WhatsApp, setStep7WhatsApp] = useState({
    status: "NOT_CONFIGURED",
    displayPhone: "",
    autoSendWhatsAppInvoice: true,
    skipped: false,
  });
  const [waConfigMeta, setWaConfigMeta] = useState<WhatsAppConfigResponse | null>(null);
  const [testWaPhone, setTestWaPhone] = useState("");
  const [sendingTestWa, setSendingTestWa] = useState(false);

  const [step8Printer, setStep8Printer] = useState({
    outletId: "",
    printerName: "Counter Thermal Receipt Printer",
    printerType: "USB_THERMAL",
    paperWidth: "80mm",
    connectionString: "",
    bridgeUrl: "",
    isDefaultBilling: true,
    autoPrintBill: true,
    skipped: false,
    savedPrinterId: "",
  });
  const [outletsList, setOutletsList] = useState<any[]>([]);
  const [testingPrint, setTestingPrint] = useState(false);

  const [step9Tables, setStep9Tables] = useState({
    enableKOT: true,
    tableCount: 12,
    areaName: "Main Hall",
  });

  // Load existing onboarding data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/onboarding/data");
        const data = await res.json();
        if (data.tenant) {
          setTenantData(data.tenant);
          setSubscription(data.subscription);

          // Populate form states
          setStep1({
            name: data.tenant.name || "",
            businessType: data.tenant.businessType || "Casual Dine",
            phone: data.tenant.phone || "",
            email: data.tenant.email || data.user?.email || "",
          });
          setStep2({
            address: data.tenant.address || "",
            city: data.tenant.city || "",
            state: data.tenant.state || "Karnataka",
            pincode: data.tenant.pincode || "",
            country: data.tenant.country || "IN",
          });

          if (data.outlets && data.outlets.length > 0) {
            setOutletsList(data.outlets);
            const out = data.outlets[0];
            setStep3({
              outletName: out.name || "",
              outletAddress: out.address || "",
              outletCity: out.city || "",
              outletPhone: out.phone || "",
              serviceModes: (out.serviceModes || "DINE_IN,TAKEAWAY,DELIVERY").split(","),
              openingHours: out.openingHours || "10:00 AM - 11:00 PM",
            });
            setStep8Printer((prev) => ({ ...prev, outletId: prev.outletId || out.id }));
          }

          if (data.printers && data.printers.length > 0) {
            const p = data.printers[0];
            setStep8Printer((prev) => ({
              ...prev,
              savedPrinterId: p.id,
              outletId: p.outletId || prev.outletId,
              printerName: p.name || prev.printerName,
              printerType: p.type || prev.printerType,
              paperWidth: p.paperWidth || prev.paperWidth,
              connectionString: p.connectionString || "",
              bridgeUrl: p.bridgeUrl || "",
              isDefaultBilling: Boolean(p.isDefaultBilling),
            }));
          }

          if (data.setting) {
            setStep4((prev) => ({
              ...prev,
              gstNumber: data.setting.gstNumber || "",
              fssaiNumber: data.setting.fssaiNumber || "",
              receiptHeader: data.setting.receiptHeader || data.tenant.name || "",
              receiptFooter: data.setting.receiptFooter || prev.receiptFooter,
              serviceChargePct: data.setting.serviceChargePct || 0,
            }));
            setStep7WhatsApp((prev) => ({
              ...prev,
              status: data.setting.hasWhatsappConnection
                ? "CONNECTED"
                : data.setting.whatsappConnectionStatus || "NOT_CONFIGURED",
              displayPhone: data.setting.whatsappDisplayPhone || "",
              autoSendWhatsAppInvoice: Boolean(data.setting.autoSendWhatsAppInvoice),
              skipped: Boolean(data.setting.whatsappOnboardingSkipped),
            }));
            setStep8Printer((prev) => ({
              ...prev,
              autoPrintBill: data.setting.autoPrintBill ?? true,
              skipped: Boolean(data.setting.printerOnboardingSkipped),
            }));
            setStep9Tables((prev) => ({
              ...prev,
              enableKOT: data.setting.enableKOT ?? true,
            }));
          }

          // Restore step progress
          const savedStep = (data.tenant.onboardingStep || 0) + 1;
          setCurrentStep(Math.min(Math.max(1, savedStep), 10));

          if (data.tenant.onboardingComplete) {
            setSuccessMsg(`Onboarding for ${data.tenant.name} is complete!`);
          }
        }
      } catch (err) {
        console.error("Failed to load onboarding data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleSaveStep(stepNum: number, payload: any) {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/onboarding/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: stepNum, currentStep: stepNum, ...payload }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || `Step ${stepNum} failed`);
      }

      if (json.onboardingComplete) {
        setSuccessMsg(json.message || "Onboarding complete! Opening POS...");
        setTimeout(() => {
          router.push("/app/pos");
        }, 1200);
        return;
      }

      if (json.printerId) {
        setStep8Printer((prev) => ({ ...prev, savedPrinterId: json.printerId }));
      }

      setSuccessMsg(
        json.skipped
          ? `✓ Step ${stepNum} skipped — you can configure it anytime in Settings → Integrations.`
          : `✓ Step ${stepNum} saved successfully.`
      );
      if (stepNum < 10) {
        setCurrentStep(stepNum + 1);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save step");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTestWhatsApp() {
    if (!testWaPhone || testWaPhone.trim().length < 10) {
      return setErrorMsg("Enter a valid mobile number with country code first.");
    }
    setSendingTestWa(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTest: true, testPhone: testWaPhone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "WhatsApp test message failed");
      setSuccessMsg("✓ Test WhatsApp message dispatched via Meta Cloud API!");
    } catch (err: any) {
      setErrorMsg(err.message || "WhatsApp test failed.");
    } finally {
      setSendingTestWa(false);
    }
  }

  async function handleOnboardingDiscoverPrinter() {
    setErrorMsg(null);
    if (step8Printer.printerType === "USB_THERMAL") {
      const res = await discoverUsbPrinter();
      if (!res.ok) return setErrorMsg(res.error || "USB discovery failed");
      setStep8Printer((prev) => ({
        ...prev,
        printerName: res.name || prev.printerName,
        connectionString: res.connectionString || prev.connectionString,
      }));
      setSuccessMsg(`✓ Discovered USB printer: ${res.name}`);
    } else if (step8Printer.printerType === "BLUETOOTH_THERMAL") {
      const res = await discoverBluetoothPrinter();
      if (!res.ok) return setErrorMsg(res.error || "Bluetooth discovery failed");
      setStep8Printer((prev) => ({
        ...prev,
        printerName: res.name || prev.printerName,
        connectionString: res.connectionString || prev.connectionString,
      }));
      setSuccessMsg(`✓ Paired Bluetooth printer: ${res.name}`);
    }
  }

  async function handleOnboardingTestPrint() {
    setTestingPrint(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const saveRes = await fetch("/api/onboarding/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 8,
          currentStep: 8,
          skip: false,
          ...step8Printer,
        }),
      });
      const sj = await saveRes.json();
      if (!saveRes.ok) throw new Error(sj.error || "Failed to save printer configuration");

      const printerId = sj.printerId || step8Printer.savedPrinterId;
      if (printerId) {
        setStep8Printer((prev) => ({ ...prev, savedPrinterId: printerId }));
      }
      const res = await fetch("/api/print-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printerId,
          jobType: "TEST",
          paperWidth: step8Printer.paperWidth,
        }),
      });
      const pj = await res.json();
      if (pj.requiresClientDispatch && pj.jobId) {
        const clientRes = await dispatchClientPrintJob({
          jobId: pj.jobId,
          printerType: step8Printer.printerType,
          connectionString: step8Printer.connectionString,
          bridgeUrl: step8Printer.bridgeUrl,
          paperWidth: step8Printer.paperWidth === "58mm" ? "58mm" : "80mm",
          escPosBase64: pj.escPosBase64,
          textLines: pj.textLines,
        });
        setSuccessMsg(
          `Test print status: ${clientRes.status}${clientRes.error ? ` (${clientRes.error})` : ""}`
        );
      } else {
        setSuccessMsg(pj.message || `Test print status: ${pj.status}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Test print failed");
    } finally {
      setTestingPrint(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sm text-[#718078]">
          <Loader2 className="h-6 w-6 animate-spin text-[#16845B]" />
          <span>Loading restaurant onboarding progress...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-[#172B25] pb-12">
      {/* Top Banner: Active Paid Plan info */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-[#718078]">Subscription Status</div>
            <div className="text-sm font-black text-[#172B25] flex items-center gap-2">
              <span>{subscription?.plan?.name || "Starter"} Plan</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20">
                Verified Active
              </span>
            </div>
          </div>
        </div>

        <div className="text-xs text-[#718078] flex items-center gap-2">
          <span>Outlets limit: <b>{subscription?.plan?.maxOutlets || 1}</b></span>
          <span>•</span>
          <span>Staff limit: <b>{subscription?.plan?.maxUsers || 5}</b></span>
          <span>•</span>
          <Link href="/app/subscription" className="text-[#16845B] font-semibold underline">
            Manage Subscription
          </Link>
        </div>
      </div>

      {/* 8-Step Tracker */}
      <div className="bg-white border border-[#E5EBE7] rounded-2xl p-4 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] gap-2">
          {ONBOARDING_STEPS.map((s) => {
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(s.id)}
                className={`flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xl transition text-center cursor-pointer ${
                  isCurrent
                    ? "bg-[#E8F5EE] border border-[#16845B]/30"
                    : "hover:bg-[#F8FAF9] border border-transparent"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    isCompleted
                      ? "bg-[#16845B] text-white"
                      : isCurrent
                      ? "bg-[#16845B] text-white ring-4 ring-[#16845B]/15"
                      : "bg-[#F0F4F2] text-[#718078]"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : s.id}
                </div>
                <div className="text-xs font-bold text-[#172B25]">{s.name}</div>
                <div className="text-[10px] text-[#718078] truncate max-w-[90px]">{s.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-[#16845B]/30 bg-[#E8F5EE] p-3 text-xs text-[#16845B] font-semibold">
          {successMsg}
        </div>
      )}

      {/* Step Contents */}
      <Card className="bg-white border-[#E5EBE7] shadow-sm">
        <CardHeader className="border-b border-[#E5EBE7] pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black text-[#172B25] flex items-center gap-2">
                <span>Step {currentStep} of 10: {ONBOARDING_STEPS[currentStep - 1].title}</span>
              </CardTitle>
              <CardDescription className="text-xs text-[#718078] mt-1">
                {ONBOARDING_STEPS[currentStep - 1].desc}
              </CardDescription>
            </div>
            <span className="text-xs font-bold text-[#16845B] bg-[#E8F5EE] px-3 py-1 rounded-full border border-[#16845B]/20">
              {ONBOARDING_STEPS[currentStep - 1].optional ? "Optional Step" : "Mandatory Setup"}
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* STEP 1: Business Information */}
          {currentStep === 1 && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <Label className="text-xs font-bold text-[#172B25]">Restaurant / Business Name *</Label>
                <Input
                  value={step1.name}
                  onChange={(e) => setStep1({ ...step1, name: e.target.value })}
                  placeholder="e.g. Spice Route Kitchen"
                  className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Business Type *</Label>
                  <select
                    value={step1.businessType}
                    onChange={(e) => setStep1({ ...step1, businessType: e.target.value })}
                    className="mt-1.5 w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-3 py-2 text-sm text-[#172B25] focus:outline-none focus:border-[#16845B]"
                  >
                    <option value="Casual Dine">Casual Dining</option>
                    <option value="Fine Dine">Fine Dining</option>
                    <option value="Cafe">Cafe / Coffee Shop</option>
                    <option value="QSR">Quick Service Restaurant (QSR)</option>
                    <option value="Cloud Kitchen">Cloud Kitchen</option>
                    <option value="Bakery">Bakery / Dessert Shop</option>
                    <option value="Food Court">Food Court Counter</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Contact Phone *</Label>
                  <Input
                    value={step1.phone}
                    onChange={(e) => setStep1({ ...step1, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">Owner Contact Email</Label>
                <Input
                  type="email"
                  value={step1.email}
                  onChange={(e) => setStep1({ ...step1, email: e.target.value })}
                  placeholder="owner@restaurant.com"
                  className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  onClick={() => handleSaveStep(1, step1)}
                  disabled={saving || !step1.name}
                  className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-6 font-bold cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Save & Continue to Address →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Business Address */}
          {currentStep === 2 && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <Label className="text-xs font-bold text-[#172B25]">Street Address *</Label>
                <Input
                  value={step2.address}
                  onChange={(e) => setStep2({ ...step2, address: e.target.value })}
                  placeholder="e.g. 142, 100 Feet Road, Indiranagar"
                  className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">City *</Label>
                  <Input
                    value={step2.city}
                    onChange={(e) => setStep2({ ...step2, city: e.target.value })}
                    placeholder="e.g. Bengaluru"
                    className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#172B25]">State *</Label>
                  <Input
                    value={step2.state}
                    onChange={(e) => setStep2({ ...step2, state: e.target.value })}
                    placeholder="e.g. Karnataka"
                    className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">PIN Code *</Label>
                  <Input
                    value={step2.pincode}
                    onChange={(e) => setStep2({ ...step2, pincode: e.target.value })}
                    placeholder="e.g. 560038"
                    className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Country</Label>
                  <Input
                    disabled
                    value="India (IN)"
                    className="mt-1.5 bg-[#F0F4F2] border-[#E5EBE7] text-sm text-[#718078]"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="rounded-full border-[#E5EBE7] text-[#172B25]"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => handleSaveStep(2, step2)}
                  disabled={saving || !step2.address || !step2.city}
                  className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-6 font-bold cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Save & Continue to Outlet Setup →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Outlet Setup */}
          {currentStep === 3 && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <Label className="text-xs font-bold text-[#172B25]">Primary Outlet Name *</Label>
                <Input
                  value={step3.outletName}
                  onChange={(e) => setStep3({ ...step3, outletName: e.target.value })}
                  placeholder="e.g. Main Branch — Indiranagar"
                  className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Outlet Phone</Label>
                  <Input
                    value={step3.outletPhone}
                    onChange={(e) => setStep3({ ...step3, outletPhone: e.target.value })}
                    placeholder="+91 98765 00000"
                    className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Operating Hours</Label>
                  <Input
                    value={step3.openingHours}
                    onChange={(e) => setStep3({ ...step3, openingHours: e.target.value })}
                    placeholder="10:00 AM - 11:00 PM"
                    className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">Supported Service Modes</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {["DINE_IN", "TAKEAWAY", "DELIVERY"].map((mode) => (
                    <label
                      key={mode}
                      className="flex items-center gap-2 p-3 border border-[#E5EBE7] rounded-xl bg-[#F8FAF9] text-xs font-bold cursor-pointer hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={step3.serviceModes.includes(mode)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setStep3({ ...step3, serviceModes: [...step3.serviceModes, mode] });
                          } else {
                            setStep3({
                              ...step3,
                              serviceModes: step3.serviceModes.filter((m) => m !== mode),
                            });
                          }
                        }}
                        className="rounded border-[#E5EBE7] text-[#16845B] focus:ring-[#16845B]"
                      />
                      <span>{mode.replace("_", " ")}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="rounded-full border-[#E5EBE7] text-[#172B25]"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => handleSaveStep(3, step3)}
                  disabled={saving}
                  className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-6 font-bold cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Save & Continue to Tax Settings →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Tax and Billing Settings */}
          {currentStep === 4 && (
            <div className="space-y-4 max-w-2xl">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">GSTIN (Goods & Services Tax)</Label>
                  <Input
                    value={step4.gstNumber}
                    onChange={(e) => setStep4({ ...step4, gstNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. 29ABCDE1234F1Z5"
                    className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm uppercase font-mono"
                  />
                  <span className="text-[10px] text-[#718078] mt-1 block">Optional for non-GST registered outlets</span>
                </div>
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">FSSAI License Number</Label>
                  <Input
                    value={step4.fssaiNumber}
                    onChange={(e) => setStep4({ ...step4, fssaiNumber: e.target.value })}
                    placeholder="14-digit FSSAI Number"
                    className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Receipt Header (Store Title)</Label>
                  <Input
                    value={step4.receiptHeader}
                    onChange={(e) => setStep4({ ...step4, receiptHeader: e.target.value })}
                    placeholder="e.g. Spice Route — Indiranagar"
                    className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Optional Service Charge %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    value={step4.serviceChargePct}
                    onChange={(e) => setStep4({ ...step4, serviceChargePct: Number(e.target.value) })}
                    className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">Receipt Footer Message</Label>
                <Input
                  value={step4.receiptFooter}
                  onChange={(e) => setStep4({ ...step4, receiptFooter: e.target.value })}
                  placeholder="Thank you for visiting! For feedback call 9876543210"
                  className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm"
                />
              </div>

              <div className="p-3 bg-[#E8F5EE] border border-[#16845B]/20 rounded-xl text-xs text-[#16845B] font-medium flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0" />
                <span>Default GST 18% (CGST 9% + SGST 9%) is pre-configured and calculated server-side.</span>
              </div>

              <div className="pt-4 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="rounded-full border-[#E5EBE7] text-[#172B25]"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => handleSaveStep(4, step4)}
                  disabled={saving}
                  className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-6 font-bold cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Save & Continue to Menu Setup →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: Menu Setup */}
          {currentStep === 5 && (
            <div className="space-y-4 max-w-2xl">
              <div className="text-xs text-[#718078]">
                Configure initial categories and items. You can add unlimited items later from the Menu Catalog.
              </div>

              <div className="space-y-3">
                {step5Categories.map((cat, idx) => (
                  <div key={idx} className="rounded-xl border border-[#E5EBE7] p-3.5 bg-[#F8FAF9] space-y-2.5">
                    <div className="flex justify-between items-center">
                      <Input
                        value={cat.name}
                        onChange={(e) => {
                          const updated = [...step5Categories];
                          updated[idx].name = e.target.value;
                          setStep5Categories(updated);
                        }}
                        className="bg-white border-[#E5EBE7] text-xs font-bold h-8 max-w-[200px]"
                        placeholder="Category Name"
                      />
                      <span className="text-[11px] text-[#718078]">{cat.items.length} product(s)</span>
                    </div>

                    <div className="space-y-2">
                      {cat.items.map((it, itemIdx) => (
                        <div key={itemIdx} className="flex items-center gap-2 bg-white p-2 border border-[#E5EBE7] rounded-lg text-xs">
                          <Input
                            value={it.name}
                            onChange={(e) => {
                              const updated = [...step5Categories];
                              updated[idx].items[itemIdx].name = e.target.value;
                              setStep5Categories(updated);
                            }}
                            className="flex-1 h-7 text-xs border-[#E5EBE7]"
                            placeholder="Dish name"
                          />
                          <div className="relative w-24">
                            <span className="absolute left-2 top-1.5 text-[10px] text-[#718078] font-bold">₹</span>
                            <Input
                              type="number"
                              value={it.price}
                              onChange={(e) => {
                                const updated = [...step5Categories];
                                updated[idx].items[itemIdx].price = Number(e.target.value);
                                setStep5Categories(updated);
                              }}
                              className="h-7 text-xs pl-5 border-[#E5EBE7]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...step5Categories];
                              updated[idx].items[itemIdx].isVeg = !updated[idx].items[itemIdx].isVeg;
                              setStep5Categories(updated);
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-bold border ${
                              it.isVeg ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {it.isVeg ? "Veg" : "Non-Veg"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(4)}
                  className="rounded-full border-[#E5EBE7] text-[#172B25]"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => handleSaveStep(5, { categories: step5Categories })}
                  disabled={saving}
                  className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-6 font-bold cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Save & Continue to Staff Setup →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6: Staff Setup */}
          {currentStep === 6 && (
            <div className="space-y-4 max-w-2xl">
              <div className="text-xs text-[#718078]">
                Add your front-of-house team and assign their initial POS operating roles.
              </div>

              <div className="space-y-3">
                {step6Staff.map((st, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 p-3 border border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
                    <Input
                      value={st.name}
                      onChange={(e) => {
                        const copy = [...step6Staff];
                        copy[i].name = e.target.value;
                        setStep6Staff(copy);
                      }}
                      placeholder="Staff Name"
                      className="flex-1 min-w-[140px] bg-white border-[#E5EBE7] text-xs h-9"
                    />
                    <Input
                      type="email"
                      value={st.email}
                      onChange={(e) => {
                        const copy = [...step6Staff];
                        copy[i].email = e.target.value;
                        setStep6Staff(copy);
                      }}
                      placeholder="email@example.com"
                      className="flex-1 min-w-[180px] bg-white border-[#E5EBE7] text-xs h-9"
                    />
                    <select
                      value={st.role}
                      onChange={(e) => {
                        const copy = [...step6Staff];
                        copy[i].role = e.target.value;
                        setStep6Staff(copy);
                      }}
                      className="bg-white border border-[#E5EBE7] rounded-xl px-2.5 py-1.5 text-xs text-[#172B25] h-9"
                    >
                      <option value="CASHIER">Cashier</option>
                      <option value="OUTLET_MANAGER">Manager</option>
                      <option value="WAITER">Waiter</option>
                      <option value="KITCHEN">Kitchen Chef</option>
                    </select>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setStep6Staff([
                    ...step6Staff,
                    { name: "", email: "", role: "WAITER" },
                  ])
                }
                className="rounded-xl border-[#E5EBE7] text-xs text-[#16845B]"
              >
                + Add Another Staff Member
              </Button>

              <div className="pt-4 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(5)}
                  className="rounded-full border-[#E5EBE7] text-[#172B25]"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => handleSaveStep(6, { staffList: step6Staff })}
                  disabled={saving}
                  className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-6 font-bold cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Save & Continue to WhatsApp →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 7 (Step A): Connect WhatsApp Business (Optional OTP Meta Embedded Signup) */}
          {currentStep === 7 && (
            <div className="space-y-5 max-w-2xl">
              <MetaWhatsAppConnectCard
                compactOnboarding={true}
                onStatusLoaded={(cfg) => {
                  setWaConfigMeta(cfg);
                  setStep7WhatsApp({
                    status: cfg.status || "NOT_CONFIGURED",
                    displayPhone: cfg.displayPhone || "",
                    autoSendWhatsAppInvoice: cfg.deliverySettings?.enabled ?? true,
                    skipped: Boolean(cfg.whatsappOnboardingSkipped),
                  });
                }}
              />

              {step7WhatsApp.status === "CONNECTED" && (
                <div className="rounded-xl border border-[#E5EBE7] bg-white p-4 space-y-2">
                  <Label className="text-xs font-bold text-[#172B25]">
                    Send Test WhatsApp Message (Optional)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={testWaPhone}
                      onChange={(e) => setTestWaPhone(e.target.value)}
                      placeholder="+91 9XXXXXXXXX"
                      className="bg-[#F8FAF9] border-[#E5EBE7] text-xs font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendTestWhatsApp}
                      disabled={sendingTestWa}
                      className="rounded-xl border-[#E5EBE7] text-xs font-bold text-[#16845B] shrink-0 cursor-pointer"
                    >
                      {sendingTestWa ? "Sending..." : "Send Test Message"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="pt-4 flex flex-wrap justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(6)}
                  className="rounded-full border-[#E5EBE7] text-[#172B25]"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => {
                      setStep7WhatsApp((prev) => ({ ...prev, skipped: true }));
                      handleSaveStep(7, { skip: true });
                    }}
                    className="rounded-full border-[#E5EBE7] text-[#718078] hover:text-[#172B25] px-5 font-semibold cursor-pointer"
                  >
                    Skip for Now
                  </Button>
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setStep7WhatsApp((prev) => ({ ...prev, skipped: false }));
                      handleSaveStep(7, {
                        skip: false,
                        autoSendWhatsAppInvoice: waConfigMeta?.deliverySettings?.enabled ?? true,
                        sendPdfTaxInvoice: waConfigMeta?.deliverySettings?.sendPdfTaxInvoice ?? true,
                        sendPaymentConfirmation:
                          waConfigMeta?.deliverySettings?.sendPaymentConfirmation ?? true,
                        sendOrderConfirmation:
                          waConfigMeta?.deliverySettings?.sendOrderConfirmation ?? false,
                      });
                    }}
                    className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-6 font-bold cursor-pointer"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    Continue to Receipt Printer →
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 8 (Step B): Connect Your Receipt Printer (Optional) */}
          {currentStep === 8 && (
            <div className="space-y-5 max-w-2xl">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Connection Method</Label>
                  <select
                    value={step8Printer.printerType}
                    onChange={(e) => setStep8Printer({ ...step8Printer, printerType: e.target.value })}
                    className="mt-1.5 w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-3 py-2 text-sm text-[#172B25]"
                  >
                    <option value="USB_THERMAL">USB Thermal Printer (WebUSB)</option>
                    <option value="NETWORK_LAN">Network / LAN Thermal Printer (Port 9100)</option>
                    <option value="BLUETOOTH_THERMAL">Supported Bluetooth Printer (BLE GATT)</option>
                    <option value="LOCAL_BRIDGE">Supported Local Print Bridge / Agent</option>
                    <option value="OS_PRINT_SERVICE">Operating System Print Service / Kiosk</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Paper Width</Label>
                  <select
                    value={step8Printer.paperWidth}
                    onChange={(e) => setStep8Printer({ ...step8Printer, paperWidth: e.target.value })}
                    className="mt-1.5 w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-3 py-2 text-sm text-[#172B25]"
                  >
                    <option value="80mm">80mm (Standard Full Width)</option>
                    <option value="58mm">58mm (Compact Roll)</option>
                  </select>
                </div>
              </div>

              {(step8Printer.printerType === "USB_THERMAL" || step8Printer.printerType === "BLUETOOTH_THERMAL") && (
                <div className="rounded-xl border border-[#16845B]/25 bg-[#E8F5EE]/50 p-3.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-[#172B25]">
                    <b>Hardware Discovery:</b> Discover a paired{" "}
                    {step8Printer.printerType === "USB_THERMAL" ? "USB thermal printer (Chrome/Edge)" : "BLE Bluetooth printer"}.
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleOnboardingDiscoverPrinter}
                    className="rounded-full bg-white border-[#E5EBE7] text-xs font-bold text-[#16845B] cursor-pointer"
                  >
                    {step8Printer.printerType === "USB_THERMAL" ? (
                      <><Usb className="h-3.5 w-3.5 mr-1" /> Discover USB Printer</>
                    ) : (
                      <><Bluetooth className="h-3.5 w-3.5 mr-1" /> Discover Bluetooth</>
                    )}
                  </Button>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Printer Name</Label>
                  <Input
                    value={step8Printer.printerName}
                    onChange={(e) => setStep8Printer({ ...step8Printer, printerName: e.target.value })}
                    placeholder="e.g. Main Billing Thermal Printer"
                    className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">
                    {step8Printer.printerType === "NETWORK_LAN"
                      ? "Printer IP:Port"
                      : step8Printer.printerType === "LOCAL_BRIDGE"
                      ? "Local Print Bridge URL"
                      : "Device ID / System Printer Name"}
                  </Label>
                  <Input
                    value={
                      step8Printer.printerType === "LOCAL_BRIDGE"
                        ? step8Printer.bridgeUrl
                        : step8Printer.connectionString
                    }
                    onChange={(e) =>
                      step8Printer.printerType === "LOCAL_BRIDGE"
                        ? setStep8Printer({ ...step8Printer, bridgeUrl: e.target.value })
                        : setStep8Printer({ ...step8Printer, connectionString: e.target.value })
                    }
                    placeholder={
                      step8Printer.printerType === "NETWORK_LAN"
                        ? "192.168.1.200:9100"
                        : step8Printer.printerType === "LOCAL_BRIDGE"
                        ? "http://127.0.0.1:9111"
                        : "Auto-filled via discovery or OS printer name"
                    }
                    className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm font-mono"
                  />
                </div>
              </div>

              {outletsList.length > 0 && (
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Default Outlet Selection</Label>
                  <select
                    value={step8Printer.outletId}
                    onChange={(e) => setStep8Printer({ ...step8Printer, outletId: e.target.value })}
                    className="mt-1.5 w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-3 py-2 text-sm text-[#172B25]"
                  >
                    {outletsList.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <label className="p-3 bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-[#172B25]">Automatic Receipt Printing Upon Bill Close</div>
                  <div className="text-[11px] text-[#718078]">Silently dispatch thermal receipt when payment settles</div>
                </div>
                <input
                  type="checkbox"
                  checked={step8Printer.autoPrintBill}
                  onChange={(e) => setStep8Printer({ ...step8Printer, autoPrintBill: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5EBE7] text-[#16845B]"
                />
              </label>

              <div className="flex items-center justify-between rounded-xl border border-[#E5EBE7] bg-white p-3.5 text-xs">
                <span className="text-[#718078]">Verify printer connectivity with a 58mm/80mm diagnostic slip:</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleOnboardingTestPrint}
                  disabled={testingPrint}
                  className="rounded-full border-[#E5EBE7] text-[#16845B] font-bold cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 mr-1" /> {testingPrint ? "Testing..." : "Test Print"}
                </Button>
              </div>

              <div className="pt-4 flex flex-wrap justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(7)}
                  className="rounded-full border-[#E5EBE7] text-[#172B25]"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => {
                      setStep8Printer((prev) => ({ ...prev, skipped: true }));
                      handleSaveStep(8, { skip: true });
                    }}
                    className="rounded-full border-[#E5EBE7] text-[#718078] hover:text-[#172B25] px-5 font-semibold cursor-pointer"
                  >
                    Skip for Now
                  </Button>
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setStep8Printer((prev) => ({ ...prev, skipped: false }));
                      handleSaveStep(8, { skip: false, ...step8Printer });
                    }}
                    className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-6 font-bold cursor-pointer"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    Connect Printer →
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 9: Tables & Kitchen Setup */}
          {currentStep === 9 && (
            <div className="space-y-4 max-w-2xl">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Primary Dining Area Name</Label>
                  <Input
                    value={step9Tables.areaName}
                    onChange={(e) => setStep9Tables({ ...step9Tables, areaName: e.target.value })}
                    placeholder="e.g. Main Hall"
                    className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-[#172B25]">Seating Capacity: Table Count</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={step9Tables.tableCount}
                    onChange={(e) => setStep9Tables({ ...step9Tables, tableCount: Number(e.target.value) })}
                    className="mt-1.5 bg-[#F8FAF9] border-[#E5EBE7] text-sm"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#172B25]">Enable Kitchen Order Ticket (KOT)</div>
                  <div className="text-[11px] text-[#718078]">Direct orders to kitchen stations upon billing</div>
                </div>
                <input
                  type="checkbox"
                  checked={step9Tables.enableKOT}
                  onChange={(e) => setStep9Tables({ ...step9Tables, enableKOT: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5EBE7] text-[#16845B]"
                />
              </div>

              <div className="pt-4 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(8)}
                  className="rounded-full border-[#E5EBE7] text-[#172B25]"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => handleSaveStep(9, step9Tables)}
                  disabled={saving}
                  className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-6 font-bold cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Save & Go to Final Review →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 10: Final Review & Launch Confirmation */}
          {currentStep === 10 && (
            <div className="space-y-5 max-w-3xl">
              <div className="rounded-2xl border border-[#16845B]/30 bg-[#E8F5EE] p-5 flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-[#16845B] text-white grid place-items-center font-bold text-lg shrink-0">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-[#172B25]">Onboarding Review & System Readiness</h4>
                  <p className="text-xs text-[#718078] mt-0.5">
                    All mandatory modules are ready. Optional WhatsApp Business &amp; Thermal Printer integrations can be updated anytime in Settings → Integrations.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-4 space-y-2">
                  <div className="text-xs font-bold text-[#172B25] uppercase tracking-wider flex items-center justify-between">
                    <span>1. Business & Location</span>
                    <button onClick={() => setCurrentStep(1)} className="text-[#16845B] text-[11px] underline">Edit</button>
                  </div>
                  <div className="text-xs text-[#718078]">
                    <div><b>Name:</b> {step1.name || tenantData?.name}</div>
                    <div><b>Type:</b> {step1.businessType}</div>
                    <div><b>City:</b> {step2.city || "Configured"}</div>
                    <div><b>Phone:</b> {step1.phone}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-4 space-y-2">
                  <div className="text-xs font-bold text-[#172B25] uppercase tracking-wider flex items-center justify-between">
                    <span>2. Tax & Billing</span>
                    <button onClick={() => setCurrentStep(4)} className="text-[#16845B] text-[11px] underline">Edit</button>
                  </div>
                  <div className="text-xs text-[#718078]">
                    <div><b>GSTIN:</b> {step4.gstNumber || "Not registered"}</div>
                    <div><b>Tax System:</b> GST 18% (CGST 9% + SGST 9%)</div>
                    <div><b>Receipt Header:</b> {step4.receiptHeader || step1.name}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-4 space-y-2">
                  <div className="text-xs font-bold text-[#172B25] uppercase tracking-wider flex items-center justify-between">
                    <span>3. WhatsApp Business</span>
                    <button onClick={() => setCurrentStep(7)} className="text-[#16845B] text-[11px] underline">Edit</button>
                  </div>
                  <div className="text-xs text-[#718078]">
                    <div>
                      <b>Status:</b>{" "}
                      {step7WhatsApp.status === "CONNECTED"
                        ? `Connected (${step7WhatsApp.displayPhone || "Verified"}) ✓`
                        : step7WhatsApp.skipped
                        ? "Skipped (Configure later in Settings)"
                        : step7WhatsApp.status}
                    </div>
                    <div><b>Auto-Send Invoice:</b> {step7WhatsApp.autoSendWhatsAppInvoice ? "ON" : "OFF"}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-4 space-y-2">
                  <div className="text-xs font-bold text-[#172B25] uppercase tracking-wider flex items-center justify-between">
                    <span>4. Receipt Printer &amp; Tables</span>
                    <button onClick={() => setCurrentStep(8)} className="text-[#16845B] text-[11px] underline">Edit</button>
                  </div>
                  <div className="text-xs text-[#718078]">
                    <div>
                      <b>Printer:</b>{" "}
                      {step8Printer.skipped
                        ? "Skipped (Configure later in Settings)"
                        : `${step8Printer.printerName} (${step8Printer.paperWidth}, ${step8Printer.printerType})`}
                    </div>
                    <div><b>Tables:</b> {step9Tables.tableCount} tables in {step9Tables.areaName}</div>
                    <div><b>KOT Engine:</b> {step9Tables.enableKOT ? "Enabled" : "Disabled"}</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center border-t border-[#E5EBE7]">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(9)}
                  className="rounded-full border-[#E5EBE7] text-[#172B25]"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>

                <Button
                  onClick={() => handleSaveStep(10, { confirmLaunch: true })}
                  disabled={saving}
                  className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-8 py-3 text-sm font-black shadow-md cursor-pointer transition transform hover:scale-[1.02]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Activating POS Environment...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4 mr-2" />
                      Confirm & Launch Restaurant POS →
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
