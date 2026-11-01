"use client";

import React, { useState } from "react";
import { RazorpayCheckoutButton } from "@/components/RazorpayCheckoutButton";

export default function StandardCheckoutPage() {
  const [amountRupees, setAmountRupees] = useState("200");
  const [name, setName] = useState("RestroNEX Demo Customer");
  const [email, setEmail] = useState("owner@restronex.app");
  const [contact, setContact] = useState("+919876543210");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const amountPaise = Math.round((parseFloat(amountRupees) || 0) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
            Payment Gateway Integration
          </span>
          <h1 className="text-3xl font-bold mt-1 text-white">Razorpay Standard Web Checkout</h1>
          <p className="text-slate-400 text-sm mt-1">
            End-to-end integration with server-side order generation and cryptographic signature verification.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Test Payment Parameters</h2>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Amount (INR) — Minimum ₹1.00 (100 paise)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">₹</span>
              <input
                type="number"
                min="1"
                step="1"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              Calculated paise: {amountPaise} paise
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Customer Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Customer Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Customer Contact Number</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2">
            <RazorpayCheckoutButton
              amountPaise={amountPaise}
              name="RestroNEX Standard Checkout"
              description={`Test payment of ₹${amountRupees}`}
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-slate-200">Execution & Event Log</h3>
            {logs.length > 0 && (
              <button
                onClick={() => setLogs([])}
                className="text-xs text-slate-500 hover:text-slate-300 underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs text-slate-300 min-h-[120px] max-h-[220px] overflow-y-auto space-y-1">
            {logs.length === 0 ? (
              <div className="text-slate-600 italic">No events yet. Click the checkout button to test.</div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={
                    log.includes("SUCCESS")
                      ? "text-emerald-400 font-semibold"
                      : log.includes("ERROR")
                      ? "text-rose-400"
                      : log.includes("DISMISSED")
                      ? "text-amber-400"
                      : "text-slate-300"
                  }
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* API Verification Checklist */}
        <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40 text-xs text-slate-400 space-y-2">
          <div className="font-semibold text-slate-200">Integration Endpoints Available:</div>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <code>POST /api/create-order</code>: Generates Razorpay order via official SDK / API (minimum 100 paise)
            </li>
            <li>
              <code>POST /api/verify-payment</code>: Cryptographically validates <code>HMAC-SHA256(order_id + &quot;|&quot; + payment_id, KEY_SECRET)</code>
            </li>
            <li>
              <code>POST /api/checkout/create-order</code> &amp; <code>/api/checkout/verify</code>: Full multi-tenant SaaS subscription billing
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

