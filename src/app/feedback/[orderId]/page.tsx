"use client";

import React, { useState, use } from "react";
import { Star, MessageSquare, ThumbsUp, Heart, ArrowRight, ExternalLink } from "lucide-react";

export default function GuestOrderFeedbackPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [googleReviewUrl, setGoogleReviewUrl] = useState("https://maps.google.com");

  const RATING_LABELS: Record<number, string> = {
    1: "Terrible 😞",
    2: "Needs Improvement 😐",
    3: "Average / Okay 🙂",
    4: "Great Experience! 😊",
    5: "Outstanding & Delicious! 🤩",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          rating,
          comment: comment.trim() || undefined,
          tenantId: "default",
        }),
      });
      setSubmitted(true);
    } catch {
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#172B25] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[#E5EBE7] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="h-12 w-12 rounded-2xl bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20 grid place-items-center mx-auto text-xl">
            🍽️
          </div>
          <h1 className="text-xl font-black text-[#172B25]">How was your dining experience?</h1>
          <p className="text-xs text-[#718078]">Order #{orderId.slice(0, 8)} • Your feedback helps us serve you better</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 5-Star Interactive Rating Selector */}
            <div className="text-center space-y-2">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition transform hover:scale-110 active:scale-95 cursor-pointer"
                  >
                    <Star
                      className={`h-9 w-9 ${
                        star <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "fill-transparent text-[#E5EBE7]"
                      } transition-colors`}
                    />
                  </button>
                ))}
              </div>
              <div className="text-xs font-bold text-[#16845B]">{RATING_LABELS[rating]}</div>
            </div>

            {/* Written Remarks */}
            <div>
              <label className="block text-xs font-bold text-[#172B25] mb-1">
                Tell us more (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you love most? Any dish recommendations or suggestions for our team?"
                rows={3}
                className="w-full rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-3 text-xs text-[#172B25] placeholder-[#718078] focus:border-[#16845B] focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-3 text-xs font-bold shadow-xs transition cursor-pointer"
            >
              {submitting ? "Submitting..." : "Submit Feedback →"}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4 pt-2">
            {rating >= 4 ? (
              // 4 or 5 Stars: Google Review Booster
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-[#16845B] grid place-items-center mx-auto text-2xl font-bold">
                  🎉
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#172B25]">Thank you for the love!</h2>
                  <p className="text-xs text-[#718078] mt-1 leading-relaxed">
                    We're thrilled you enjoyed your meal! Would you take 15 seconds to share your review on Google? It means the world to our team.
                  </p>
                </div>

                <a
                  href={googleReviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full rounded-full bg-[#172B25] hover:bg-black text-white py-3 text-xs font-bold shadow-xs transition"
                >
                  Post Review on Google Maps <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              // 1, 2, or 3 Stars: Private Manager Resolution
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-700 grid place-items-center mx-auto text-2xl font-bold">
                  🤝
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#172B25]">Thank you for your honesty</h2>
                  <p className="text-xs text-[#718078] mt-1 leading-relaxed">
                    We apologize that your experience wasn't flawless today. Your remarks have been delivered directly to our restaurant manager to inspect and rectify.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2">
              <span className="text-[11px] text-[#718078] font-mono">Feedback recorded ✓</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

