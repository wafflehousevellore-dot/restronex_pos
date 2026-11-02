"use client";

import React, { useState } from "react";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface RazorpayCheckoutButtonProps {
  amountPaise?: number; // In paise: e.g., 50000 = ₹500
  currency?: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  onSuccess?: (data: { order_id: string; payment_id: string }) => void;
  onError?: (error: string) => void;
  onDismiss?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function RazorpayCheckoutButton({
  amountPaise = 20000, // ₹200 default Starter
  currency = "INR",
  name = "RestroNEX",
  description = "Standard Subscription / Order",
  prefill = {
    name: "Restaurant Owner",
    email: "owner@restronex.app",
    contact: "+919999999999",
  },
  onSuccess,
  onError,
  onDismiss,
  className,
  children,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dynamically load Razorpay standard checkout script if not present
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.getElementById("razorpay-checkout-js");
      if (existingScript) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.id = "razorpay-checkout-js";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Failed to load Razorpay checkout SDK. Please check your internet connection.");
      }

      // STEP 1: Call Backend to Create Order
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          currency,
          receipt: `rcpt_${Date.now()}`,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to create order on server");
      }

      const keyId =
        orderData.key_id ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        "rzp_test_TuF3qWBxTq73Xs";

      // STEP 2: Configure and open Razorpay modal with order_id
      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name,
        description,
        order_id: orderData.order_id,
        prefill,
        theme: {
          color: "#16845B",
        },
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          setVerifying(true);
          try {
            // STEP 3: Call Backend to Verify Payment Signature
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment verification failed on server");
            }

            setSuccessMsg(`✓ Payment successful! ID: ${response.razorpay_payment_id}`);
            if (onSuccess) {
              onSuccess({
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
              });
            }
          } catch (err: any) {
            const msg = err.message || "Payment verification failed";
            setErrorMsg(msg);
            if (onError) onError(msg);
          } finally {
            setVerifying(false);
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            const msg = "Checkout was cancelled by user.";
            setErrorMsg(msg);
            if (onDismiss) onDismiss();
          },
        },
      };

      const rzpInstance = new window.Razorpay(options);

      // Handle payment failed event
      rzpInstance.on("payment.failed", function (response: any) {
        setLoading(false);
        const reason =
          response?.error?.description || response?.error?.reason || "Payment transaction failed";
        const msg = `Payment failed: ${reason}`;
        setErrorMsg(msg);
        if (onError) onError(msg);
      });

      rzpInstance.open();
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || "An unexpected error occurred during checkout";
      setErrorMsg(msg);
      if (onError) onError(msg);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading || verifying}
        className={
          className ||
          "px-5 py-2.5 rounded-xl font-semibold text-white bg-[#16845B] hover:bg-[#116B49] shadow-xs hover:shadow-sm disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
        }
      >
        {loading
          ? "Initializing Checkout..."
          : verifying
          ? "Verifying Payment..."
          : children || `Pay ₹${(amountPaise / 100).toFixed(2)} with Razorpay`}
      </button>

      {errorMsg && (
        <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700">
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 text-xs rounded-xl bg-[#E8F5EE] border border-[#16845B]/30 text-[#16845B] font-medium">
          {successMsg}
        </div>
      )}
    </div>
  );
}
