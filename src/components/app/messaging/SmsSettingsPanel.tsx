"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Play, RefreshCw, Send, ShieldCheck, Key, Phone, FileText } from "lucide-react";

export default function SmsSettingsPanel() {
  const [provider, setProvider] = useState<"FAST2SMS" | "MSG91" | "TWILIO" | "MOCK">("FAST2SMS");
  const [apiKey, setApiKey] = useState("");
  const [senderId, setSenderId] = useState("RSTRNX");
  const [templateId, setTemplateId] = useState("");
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("NOT_CONNECTED");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const res = await apiFetch("/api/messages/sms-config");
      const json = await res.json();
      if (res.ok && json.config) {
        setProvider(json.config.provider || "FAST2SMS");
        setApiKey(json.config.apiKey || "");
        setSenderId(json.config.senderId || "RSTRNX");
        setTemplateId(json.config.templateId || "");
        setAccountSid(json.config.accountSid || "");
        setAuthToken(json.config.authToken || "");
        setFromNumber(json.config.fromNumber || "");
        setStatus(json.config.status || "NOT_CONNECTED");
      }
    } catch {}
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await apiFetch("/api/messages/sms-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey,
          senderId,
          templateId,
          accountSid,
          authToken,
          fromNumber,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "SMS provider configuration saved successfully!" });
        setStatus("CONNECTED");
      } else {
        setMsg({ type: "error", text: data.error || "Failed to save SMS settings." });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to save SMS settings." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    if (!testPhone || testPhone.trim().length < 10) {
      return setMsg({
        type: "error",
        text: "Please enter a valid 10-digit mobile number with country code (e.g. +91 9876543210).",
      });
    }

    setTesting(true);
    setMsg(null);
    try {
      const res = await apiFetch("/api/messages/sms-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey,
          senderId,
          templateId,
          accountSid,
          authToken,
          fromNumber,
          testPhone,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({
          type: "success",
          text: `Test SMS sent successfully to ${testPhone}! Check your phone.`,
        });
      } else {
        setMsg({ type: "error", text: data.error || "Test SMS failed." });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Test SMS delivery failed." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold border ${
            msg.type === "success"
              ? "bg-[#E8F5EE] border-[#B2DECA] text-[#16845B]"
              : "bg-red-50 border-red-200 text-red-600"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Main Configuration Card */}
      <Card className="rounded-3xl border border-[#E5EBE7] bg-white shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-[#172B25]">
                  Transactional SMS Gateway
                </CardTitle>
                <CardDescription className="text-xs text-[#718078]">
                  Automatically deliver concise billing notifications and digital invoice URLs via SMS.
                </CardDescription>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                status === "CONNECTED"
                  ? "bg-[#E8F5EE] text-[#16845B]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {status === "CONNECTED" ? "CONNECTED" : "NOT CONFIGURED"}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 text-xs">
          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#172B25] block">SMS Gateway Provider</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "FAST2SMS", label: "Fast2SMS (India)" },
                { id: "MSG91", label: "MSG91 (India DLT)" },
                { id: "TWILIO", label: "Twilio (Global)" },
                { id: "MOCK", label: "Mock (Testing)" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id as any)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                    provider === p.id
                      ? "border-[#16845B] bg-[#E8F5EE] text-[#16845B]"
                      : "border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Provider Specific Credentials */}
          {(provider === "FAST2SMS" || provider === "MSG91") && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="font-bold text-[#172B25] flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-[#718078]" />
                  <span>{provider === "FAST2SMS" ? "Fast2SMS API Key" : "MSG91 AuthKey"}</span>
                </label>
                <Input
                  type="password"
                  placeholder="Enter API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="rounded-xl border-[#E5EBE7]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#172B25]">Sender ID (Header)</label>
                  <Input
                    placeholder="e.g. RSTRNX"
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                    className="rounded-xl border-[#E5EBE7]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#172B25]">DLT Template ID (Optional)</label>
                  <Input
                    placeholder="e.g. 1207161829..."
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="rounded-xl border-[#E5EBE7]"
                  />
                </div>
              </div>
            </div>
          )}

          {provider === "TWILIO" && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#172B25]">Twilio Account SID</label>
                  <Input
                    placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    value={accountSid}
                    onChange={(e) => setAccountSid(e.target.value)}
                    className="rounded-xl border-[#E5EBE7]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#172B25]">Twilio Auth Token</label>
                  <Input
                    type="password"
                    placeholder="Enter auth token"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    className="rounded-xl border-[#E5EBE7]"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#172B25]">From Phone Number</label>
                <Input
                  placeholder="+1XXXXXXXXXX"
                  value={fromNumber}
                  onChange={(e) => setFromNumber(e.target.value)}
                  className="rounded-xl border-[#E5EBE7]"
                />
              </div>
            </div>
          )}

          {provider === "MOCK" && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs">
              <strong>Mock Mode Active:</strong> Outgoing SMS messages will be simulated and logged in the Delivery Logs without calling third-party telecom APIs. Ideal for sandbox testing.
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white px-5 py-2.5 font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>{saving ? "Saving..." : "Save SMS Configuration"}</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Test SMS Card */}
      <Card className="rounded-3xl border border-[#E5EBE7] bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-sm font-black text-[#172B25]">
            Send Test SMS Verification
          </CardTitle>
          <CardDescription className="text-xs text-[#718078]">
            Verify gateway connectivity and Indian DLT / carrier delivery instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="+91 9XXXXXXXXX"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="rounded-xl border-[#E5EBE7] text-xs font-mono"
            />
            <button
              type="button"
              onClick={handleSendTest}
              disabled={testing}
              className="rounded-xl bg-[#172B25] hover:bg-[#233F36] text-white px-5 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-60 cursor-pointer"
            >
              {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              <span>{testing ? "Sending Test..." : "Dispatch Test SMS"}</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
