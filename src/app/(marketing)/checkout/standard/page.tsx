"use client";

import React, { useState } from "react";
import { RazorpayCheckoutButton } from "@/components/RazorpayCheckoutButton";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { brand } from "@/lib/brand";

export default function StandardCheckoutPage() {
  const [amountRupees, setAmountRupees] = useState("99");
  const [name, setName] = useState("RestroNEX Customer");
  const [email, setEmail] = useState<string>(brand.contact.email);
  const [contact, setContact] = useState("+919513008467");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const amountPaise = Math.round((parseFloat(amountRupees) || 0) * 100);

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#172B25] p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5EE] text-[#16845B] text-xs font-semibold mb-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Razorpay Standard Web Checkout</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#172B25] tracking-tight">Payment Gateway Integration</h1>
            <p className="text-[#718078] text-sm mt-1">
              Test end-to-end server order creation, modal checkout, and cryptographic HMAC-SHA256 signature verification.
            </p>
          </div>
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#718078] hover:text-[#16845B] bg-white border border-[#E5EBE7] px-3.5 py-2 rounded-xl transition shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
        </div>

        <div className="bg-white border border-[#E5EBE7] rounded-2xl p-6 space-y-5 shadow-xs">
          <h2 className="text-base font-bold text-[#172B25]">Payment Parameters</h2>

          <div>
            <label className="block text-xs font-semibold text-[#172B25] uppercase tracking-wider mb-1.5">
              Amount (INR) — Minimum ₹1.00 (100 paise)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-[#718078] font-bold">₹</span>
              <input
                type="number"
                min="1"
                step="1"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl pl-8 pr-4 py-2.5 text-sm font-semibold text-[#172B25] focus:outline-none focus:border-[#16845B] focus:ring-2 focus:ring-[#16845B]/20 transition"
              />
            </div>
            <span className="text-xs text-[#718078] mt-1.5 block">
              Converted amount: <b>{amountPaise} paise</b>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B25] uppercase tracking-wider mb-1.5">
                Customer Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-3.5 py-2 text-sm text-[#172B25] focus:outline-none focus:border-[#16845B] focus:ring-2 focus:ring-[#16845B]/20 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B25] uppercase tracking-wider mb-1.5">
                Customer Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-3.5 py-2 text-sm text-[#172B25] focus:outline-none focus:border-[#16845B] focus:ring-2 focus:ring-[#16845B]/20 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B25] uppercase tracking-wider mb-1.5">
              Contact Phone
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl px-3.5 py-2 text-sm text-[#172B25] focus:outline-none focus:border-[#16845B] focus:ring-2 focus:ring-[#16845B]/20 transition"
            />
          </div>

          <div className="pt-2">
            <RazorpayCheckoutButton
              amountPaise={amountPaise}
              name="RestroNEX Standard Checkout"
              description={`Payment of ₹${amountRupees}`}
              prefill={{ name, email, contact }}
              onSuccess={(data) => {
                addLog(`SUCCESS: Order ${data.order_id} verified with payment ${data.payment_id}`);
              }}
              onError={(err) => {
                addLog(`ERROR: ${err}`);
              }}
              onDismiss={() => {
                addLog("DISMISSED: User closed checkout modal without paying.");
              }}
            />
          </div>
        </div>

        {/* Live Logs / Audit Trail */}
        <div className="bg-white border border-[#E5EBE7] rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-[#172B25]">Event & Verification Log</h3>
            {logs.length > 0 && (
              <button
                onClick={() => setLogs([])}
                className="text-xs text-[#718078] hover:text-[#172B25] underline cursor-pointer"
              >
                Clear Log
              </button>
            )}
          </div>
          <div className="bg-[#F0F4F2] border border-[#E5EBE7] rounded-xl p-3.5 font-mono text-xs text-[#172B25] min-h-[120px] max-h-[220px] overflow-y-auto space-y-1.5">
            {logs.length === 0 ? (
              <div className="text-[#718078] italic">No events yet. Click the pay button to trigger checkout.</div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={
                    log.includes("SUCCESS")
                      ? "text-[#16845B] font-bold"
                      : log.includes("ERROR")
                      ? "text-red-600 font-semibold"
                      : log.includes("DISMISSED")
                      ? "text-amber-700"
                      : "text-[#172B25]"
                  }
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security & Endpoint Info */}
        <div className="border border-[#E5EBE7] rounded-2xl p-4 bg-[#E8F5EE]/40 text-xs text-[#718078] space-y-2">
          <div className="font-bold text-[#172B25] flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[#16845B]" />
            Active Integration Endpoints
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <code>POST /api/create-order</code>: Generates order via Razorpay SDK (minimum 100 paise)
            </li>
            <li>
              <code>POST /api/verify-payment</code>: Cryptographically validates <code>HMAC-SHA256</code>
            </li>
            <li>
              <code>POST /api/checkout/create-order</code> &amp; <code>/api/checkout/verify</code>: SaaS subscription flows
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
