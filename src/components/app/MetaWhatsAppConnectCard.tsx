"use client";

import React, { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Unplug,
} from "lucide-react";

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

export interface WhatsAppConfigResponse {
  metaPartnerConfigured: boolean;
  metaAppId: string | null;
  embeddedSignupConfigId: string | null;
  missingMetaPrerequisites: string[];
  source: string;
  status: string;
  displayPhone: string | null;
  connectionMode: string;
  isCoexistence: boolean;
  connectedAt: string | null;
  lastVerifiedAt: string | null;
  verificationError: string | null;
  whatsappOnboardingSkipped: boolean;
  deliverySettings: {
    enabled: boolean;
    sendPdfTaxInvoice: boolean;
    sendPaymentConfirmation: boolean;
    sendOrderConfirmation: boolean;
    defaultWhatsAppOutletId: string | null;
  };
  availableSenders: {
    scope: string;
    outletId: string | null;
    label: string;
    displayPhone: string;
    status: string;
    isDefaultSender: boolean;
    isCoexistence: boolean;
    connectedAt: string | null;
    lastVerifiedAt: string | null;
  }[];
  lastSuccessfulDelivery: {
    id: string;
    at: string;
    status: string;
  } | null;
  recentLogs: {
    id: string;
    orderId: string | null;
    orderNumber: string;
    recipientPhone: string;
    status: string;
    errorMessage: string | null;
    createdAt: string;
  }[];
}

function loadFacebookSdk(appId: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser required"));
  if (window.FB) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    window.fbAsyncInit = function () {
      try {
        window.FB.init({
          appId,
          autoLogAppEvents: true,
          xfbml: false,
          version: "v21.0",
        });
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    const existingScript = document.getElementById("facebook-jssdk");
    if (existingScript) return;
    const js = document.createElement("script");
    js.id = "facebook-jssdk";
    js.async = true;
    js.defer = true;
    js.crossOrigin = "anonymous";
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    js.onerror = () => reject(new Error("Failed to load Meta Facebook SDK."));
    document.body.appendChild(js);
  });
}

export default function MetaWhatsAppConnectCard({
  outletId,
  compactOnboarding = false,
  onStatusLoaded,
}: {
  outletId?: string;
  compactOnboarding?: boolean;
  onStatusLoaded?: (data: WhatsAppConfigResponse) => void;
}) {
  const [data, setData] = useState<WhatsAppConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [coexistenceRequested, setCoexistenceRequested] = useState(true);
  const [banner, setBanner] = useState<{
    type: "success" | "error" | "warning";
    text: string;
    detail?: string;
  } | null>(null);

  const [prefs, setPrefs] = useState({
    enabled: true,
    sendPdfTaxInvoice: true,
    sendPaymentConfirmation: true,
    sendOrderConfirmation: false,
    defaultWhatsAppOutletId: "",
  });

  const sessionMetaRef = useRef<{
    wabaId?: string;
    phoneNumberId?: string;
    businessId?: string;
    eventType?: string;
  }>({});

  async function fetchConfig() {
    setLoading(true);
    try {
      const qs = outletId ? `?outletId=${encodeURIComponent(outletId)}` : "";
      const res = await apiFetch(`/api/whatsapp/config${qs}`);
      const json: WhatsAppConfigResponse = await res.json();
      if (res.ok && json) {
        setData(json);
        setPrefs({
          enabled: json.deliverySettings?.enabled ?? true,
          sendPdfTaxInvoice: json.deliverySettings?.sendPdfTaxInvoice ?? true,
          sendPaymentConfirmation: json.deliverySettings?.sendPaymentConfirmation ?? true,
          sendOrderConfirmation: json.deliverySettings?.sendOrderConfirmation ?? false,
          defaultWhatsAppOutletId: json.deliverySettings?.defaultWhatsAppOutletId || "",
        });
        onStatusLoaded?.(json);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletId]);

  // Listen to Meta Embedded Signup WA_EMBEDDED_SIGNUP postMessage session telemetry
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") {
        return;
      }
      try {
        const payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (payload?.type === "WA_EMBEDDED_SIGNUP") {
          if (
            payload.event === "FINISH" ||
            payload.event === "FINISH_ONLY_WABA" ||
            payload.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
          ) {
            sessionMetaRef.current = {
              wabaId: payload.data?.waba_id,
              phoneNumberId: payload.data?.phone_number_id,
              businessId: payload.data?.business_id,
              eventType: payload.event,
            };
          } else if (payload.event === "CANCEL") {
            setBanner({
              type: "warning",
              text: "WhatsApp Business connection was cancelled before Meta verification completed.",
            });
          }
        }
      } catch {
        // Ignore unrelated postMessage frames
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function launchEmbeddedSignup() {
    setBanner(null);

    if (!data?.metaPartnerConfigured || !data.metaAppId || !data.embeddedSignupConfigId) {
      setBanner({
        type: "warning",
        text: "Meta Tech Provider / Embedded Signup prerequisites must be provisioned before connecting.",
        detail:
          data?.missingMetaPrerequisites?.join(" • ") ||
          "Configure NEXT_PUBLIC_META_APP_ID, NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID, and META_APP_SECRET.",
      });
      return;
    }

    setConnecting(true);
    sessionMetaRef.current = {};

    try {
      await loadFacebookSdk(data.metaAppId);

      window.FB.login(
        async (response: any) => {
          const authCode = response?.authResponse?.code;
          if (!authCode) {
            setConnecting(false);
            setBanner({
              type: "error",
              text: "Meta authorization did not complete. Your existing WhatsApp Business status remains unchanged.",
            });
            return;
          }

          try {
            const verifyRes = await apiFetch("/api/whatsapp/embedded-signup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code: authCode,
                outletId: outletId || undefined,
                wabaId: sessionMetaRef.current.wabaId,
                phoneNumberId: sessionMetaRef.current.phoneNumberId,
                businessId: sessionMetaRef.current.businessId,
                eventType: sessionMetaRef.current.eventType,
                coexistenceRequested,
                deliverySettings: prefs,
              }),
            });
            const verifyJson = await verifyRes.json();
            if (!verifyRes.ok) {
              setBanner({
                type: verifyJson.code === "COEXISTENCE_UNAVAILABLE" ? "warning" : "error",
                text: verifyJson.error || "Backend verification failed.",
                detail: verifyJson.supportedAlternative || undefined,
              });
            } else {
              setBanner({
                type: "success",
                text: verifyJson.message || "WhatsApp Business verified and connected cleanly.",
              });
            }
            await fetchConfig();
          } catch (err: any) {
            setBanner({
              type: "error",
              text: err?.message || "Failed to finalize Meta WhatsApp verification.",
            });
          } finally {
            setConnecting(false);
          }
        },
        {
          config_id: data.embeddedSignupConfigId,
          response_type: "code",
          override_default_response_type: true,
          extras: {
            setup: {},
            featureType: coexistenceRequested ? "whatsapp_business_app_onboarding" : undefined,
            sessionInfoVersion: "3",
          },
        }
      );
    } catch (err: any) {
      setConnecting(false);
      setBanner({
        type: "error",
        text: err?.message || "Unable to open Meta Embedded Signup popup.",
      });
    }
  }

  async function verifyConnectionNow() {
    setVerifying(true);
    setBanner(null);
    try {
      const res = await apiFetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_CONNECTION",
          outletId: outletId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: json.error || "Verification check failed." });
      } else {
        setBanner({
          type: "success",
          text: `Verified live sender status on Meta for ${json.displayPhone || "your account"}.`,
        });
      }
      await fetchConfig();
    } finally {
      setVerifying(false);
    }
  }

  async function disconnectWhatsApp() {
    if (
      !confirm(
        "Disconnect this WhatsApp Business number? Existing customer invoices, sales history, and CRM data will remain completely intact."
      )
    ) {
      return;
    }
    setDisconnecting(true);
    setBanner(null);
    try {
      const res = await apiFetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISCONNECT",
          outletId: outletId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: json.error || "Disconnect failed." });
      } else {
        setBanner({ type: "success", text: json.message });
      }
      await fetchConfig();
    } finally {
      setDisconnecting(false);
    }
  }

  async function savePreferences() {
    setSavingPrefs(true);
    setBanner(null);
    try {
      const res = await apiFetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_DELIVERY_SETTINGS",
          outletId: outletId || undefined,
          enabled: prefs.enabled,
          sendPdfTaxInvoice: prefs.sendPdfTaxInvoice,
          sendPaymentConfirmation: prefs.sendPaymentConfirmation,
          sendOrderConfirmation: prefs.sendOrderConfirmation,
          defaultWhatsAppOutletId: prefs.defaultWhatsAppOutletId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: json.error || "Failed to save delivery preferences." });
      } else {
        setBanner({ type: "success", text: "WhatsApp automatic delivery preferences saved." });
        await fetchConfig();
      }
    } finally {
      setSavingPrefs(false);
    }
  }

  const status = data?.status || "NOT_CONFIGURED";
  const isConnected = status === "CONNECTED";
  const statusChipClass =
    status === "CONNECTED"
      ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
      : status === "DISCONNECTED" || status === "VERIFICATION_FAILED"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-amber-50 border-amber-200 text-amber-800";

  return (
    <div className="space-y-4">
      {banner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
            banner.type === "success"
              ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
              : banner.type === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <div>
            <div className="font-bold">{banner.text}</div>
            {banner.detail && <div className="mt-1 opacity-90 text-[11px]">{banner.detail}</div>}
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="font-bold px-1.5 opacity-70 hover:opacity-100 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      <Card className="bg-white border-[#E5EBE7] shadow-xs overflow-hidden">
        <CardHeader className="pb-4 border-b border-[#E5EBE7] bg-gradient-to-r from-[#F8FAF9] to-[#E8F5EE]/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[#16845B] text-white grid place-items-center shrink-0 shadow-xs">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-[#172B25]">
                  Connect Your WhatsApp Business
                </CardTitle>
                <CardDescription className="text-xs text-[#718078] mt-1 max-w-xl">
                  Connect your restaurant&apos;s WhatsApp number to automatically deliver customer invoices and order notifications.
                </CardDescription>
              </div>
            </div>

            <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${statusChipClass}`}>
              {loading ? "Checking..." : status.replace(/_/g, " ")}
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-5">
          {!data?.metaPartnerConfigured && !loading && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 space-y-2">
              <div className="font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                Meta Embedded Signup Setup Required on Platform
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900">
                Direct OTP signup activates once RestroNex&apos;s Meta App Review, Tech Provider Embedded Signup Configuration, and webhook verification keys are added to server environment variables. No fake connection will be simulated.
              </p>
              {data?.missingMetaPrerequisites && data.missingMetaPrerequisites.length > 0 && (
                <ul className="list-disc pl-5 text-[11px] text-amber-900 space-y-0.5">
                  {data.missingMetaPrerequisites.map((req) => (
                    <li key={req}>{req}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {isConnected ? (
            <div className="rounded-2xl border border-[#16845B]/25 bg-[#E8F5EE]/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#16845B] shrink-0" />
                  <div>
                    <div className="text-sm font-black text-[#172B25]">
                      {data?.displayPhone || "Verified WhatsApp Business Number"}
                    </div>
                    <div className="text-[11px] text-[#718078] flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span>
                        Mode:{" "}
                        <b className="text-[#172B25]">
                          {data?.isCoexistence ? "WhatsApp Business App Coexistence" : "Meta Cloud API"}
                        </b>
                      </span>
                      {data?.connectedAt && (
                        <span>
                          Connected:{" "}
                          <b className="text-[#172B25]">
                            {new Date(data.connectedAt).toLocaleString("en-IN")}
                          </b>
                        </span>
                      )}
                      {data?.lastVerifiedAt && (
                        <span>
                          Last Verified:{" "}
                          <b className="text-[#172B25]">
                            {new Date(data.lastVerifiedAt).toLocaleString("en-IN")}
                          </b>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={verifyConnectionNow}
                    disabled={verifying}
                    className="rounded-full border border-[#E5EBE7] bg-white hover:bg-[#F8FAF9] px-3.5 py-1.5 text-xs font-bold text-[#172B25] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${verifying ? "animate-spin" : ""}`} />
                    {verifying ? "Verifying..." : "Verify Status"}
                  </button>
                  <button
                    type="button"
                    onClick={launchEmbeddedSignup}
                    disabled={connecting}
                    className="rounded-full bg-[#16845B] hover:bg-[#116B49] px-4 py-1.5 text-xs font-bold text-white cursor-pointer"
                  >
                    {connecting ? "Connecting..." : "Reconnect"}
                  </button>
                  <button
                    type="button"
                    onClick={disconnectWhatsApp}
                    disabled={disconnecting}
                    className="rounded-full border border-red-200 bg-white hover:bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Unplug className="h-3.5 w-3.5" />
                    {disconnecting ? "Disconnecting..." : "Disconnect"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-5 space-y-4">
              {data?.verificationError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  <b>Last Verification Note:</b> {data.verificationError}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCoexistenceRequested(true)}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    coexistenceRequested
                      ? "bg-white border-[#16845B] ring-2 ring-[#16845B]/15"
                      : "bg-white/70 border-[#E5EBE7] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-[#172B25]">
                    <Smartphone className="h-4 w-4 text-[#16845B]" />
                    Use Existing WhatsApp Business App (Coexistence)
                  </div>
                  <p className="text-[11px] text-[#718078] mt-1 leading-relaxed">
                    Keep using WhatsApp Business on your counter phone alongside RestroNex where supported by Meta. Never silently disconnects your app.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCoexistenceRequested(false)}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    !coexistenceRequested
                      ? "bg-white border-[#16845B] ring-2 ring-[#16845B]/15"
                      : "bg-white/70 border-[#E5EBE7] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-[#172B25]">
                    <MessageSquare className="h-4 w-4 text-[#16845B]" />
                    Connect Dedicated Cloud Number
                  </div>
                  <p className="text-[11px] text-[#718078] mt-1 leading-relaxed">
                    Select a Business Portfolio &amp; verify any dedicated phone number with Meta OTP verification.
                  </p>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={launchEmbeddedSignup}
                  disabled={connecting}
                  className="rounded-full bg-[#16845B] hover:bg-[#116B49] disabled:opacity-70 text-white px-7 py-3 text-sm font-black shadow-sm transition inline-flex items-center gap-2 cursor-pointer"
                >
                  {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  {connecting ? "Connecting with Meta..." : status === "DISCONNECTED" ? "Reconnect WhatsApp" : "Connect WhatsApp"}
                </button>

                {!coexistenceRequested && (
                  <span className="text-[11px] text-[#718078]">
                    Coexistence unavailable? A dedicated Cloud number keeps your mobile WhatsApp untouched.
                  </span>
                )}
              </div>

              <ul className="space-y-1.5 text-xs text-[#172B25] pt-1 border-t border-[#E5EBE7]">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#16845B] shrink-0" />
                  Secure connection powered by Meta
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#16845B] shrink-0" />
                  Use your existing WhatsApp Business number where supported.
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#16845B] shrink-0" />
                  Your restaurant retains control of its WhatsApp account.
                </li>
              </ul>
            </div>
          )}

          {/* Automatic Delivery Settings */}
          <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#172B25]">
              Automatic Delivery Settings
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.enabled}
                  onChange={(e) => setPrefs({ ...prefs, enabled: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded text-[#16845B]"
                />
                <div className="text-xs">
                  <div className="font-bold text-[#172B25]">Enable automatic WhatsApp delivery</div>
                  <div className="text-[11px] text-[#718078]">Master toggle for transactional messages</div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.sendPdfTaxInvoice}
                  onChange={(e) => setPrefs({ ...prefs, sendPdfTaxInvoice: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded text-[#16845B]"
                />
                <div className="text-xs">
                  <div className="font-bold text-[#172B25]">Send PDF tax invoice after bill closure</div>
                  <div className="text-[11px] text-[#718078]">Generates &amp; attaches official GST PDF bill</div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.sendPaymentConfirmation}
                  onChange={(e) => setPrefs({ ...prefs, sendPaymentConfirmation: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded text-[#16845B]"
                />
                <div className="text-xs">
                  <div className="font-bold text-[#172B25]">Send payment confirmation</div>
                  <div className="text-[11px] text-[#718078]">Includes settled UPI / Cash / Card status</div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.sendOrderConfirmation}
                  onChange={(e) => setPrefs({ ...prefs, sendOrderConfirmation: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded text-[#16845B]"
                />
                <div className="text-xs">
                  <div className="font-bold text-[#172B25]">Send order confirmation</div>
                  <div className="text-[11px] text-[#718078]">Notify guest when order enters kitchen queue</div>
                </div>
              </label>
            </div>

            {data?.availableSenders && data.availableSenders.length > 1 && (
              <div className="pt-1">
                <label className="text-xs font-bold text-[#172B25] block mb-1">
                  Default Outlet Sender
                </label>
                <select
                  value={prefs.defaultWhatsAppOutletId}
                  onChange={(e) => setPrefs({ ...prefs, defaultWhatsAppOutletId: e.target.value })}
                  className="w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-3 py-2 text-xs font-semibold text-[#172B25]"
                >
                  <option value="">Organization Main Account</option>
                  {data.availableSenders
                    .filter((s) => s.outletId)
                    .map((s) => (
                      <option key={s.outletId!} value={s.outletId!}>
                        {s.label}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {!compactOnboarding && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={savePreferences}
                  disabled={savingPrefs}
                  className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-5 py-2 text-xs font-bold cursor-pointer"
                >
                  {savingPrefs ? "Saving..." : "Save Delivery Preferences"}
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
