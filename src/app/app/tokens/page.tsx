"use client";
import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Tokens() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [outletId, setOutletId] = useState("");
  const [outlets, setOutlets] = useState<any[]>([]);

  async function loadOutlets() {
    const o = await apiFetch("/api/outlets").then((r) => r.json()).catch(() => []);
    if (Array.isArray(o)) setOutlets(o);
  }

  const load = useCallback(async () => {
    if (!outletId) return;
    const j = await fetch(`/api/tokens?outletId=${outletId}`).then((r) => r.json()).catch(() => []);
    if (Array.isArray(j)) setTokens(j);
  }, [outletId]);

  useEffect(() => {
    loadOutlets();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function issue() {
    await apiFetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outletId }),
    });
    load();
  }

  async function advance(id: string) {
    await apiFetch("/api/tokens", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId: id, status: "COMPLETED" }),
    });
    load();
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black text-[#172B25]">Token Management — QSR Queue</h1>
        <p className="text-xs text-[#718078] mt-1">Live order token dispatch and overhead LED calling display integration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#172B25]">Issue Token</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <select
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
            className="rounded-xl border border-[#E5EBE7] bg-white px-3.5 py-2 text-sm text-[#172B25] focus:outline-none focus:border-[#16845B]"
          >
            <option value="">Select outlet</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <button
            onClick={issue}
            className="rounded-full bg-[#16845B] hover:bg-[#116B49] px-6 py-2 text-sm font-bold text-white transition shadow-xs"
          >
            Issue Token
          </button>
          <button
            onClick={load}
            className="rounded-full border border-[#E5EBE7] bg-white px-4 py-2 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition shadow-xs"
          >
            Refresh
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#172B25]">Active Queue — {tokens.length}</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          {tokens.map((t) => (
            <div
              key={t.id}
              className={`rounded-2xl border p-5 text-center transition ${
                t.status === "WAITING"
                  ? "bg-[#F8FAF9] border-[#E5EBE7] text-[#172B25]"
                  : "bg-[#E8F5EE] text-[#16845B] border-[#16845B]/30"
              }`}
            >
              <div className="text-3xl font-black">#{t.tokenNo}</div>
              <div className="text-xs font-semibold mt-1">
                {t.status} • Queue #{t.queuePos}
              </div>
              <div className="text-xs text-[#718078] mt-1">{new Date(t.createdAt).toLocaleTimeString()}</div>
              {t.status === "WAITING" && (
                <button
                  onClick={() => advance(t.id)}
                  className="mt-3 rounded-full bg-[#16845B] text-white hover:bg-[#116B49] px-4 py-1.5 text-xs font-bold transition shadow-xs"
                >
                  Mark Ready & Bump
                </button>
              )}
            </div>
          ))}
          {tokens.length === 0 && (
            <div className="text-sm text-[#718078] col-span-full text-center py-8 border border-dashed border-[#E5EBE7] rounded-xl">
              No active tokens in queue.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 text-xs text-[#718078] leading-relaxed">
          Overhead Digital Display mirror enabled at <code>/display/[outletSlug]</code>. Token sequence respects queue positioning with automatic audio chime when bumped.
        </CardContent>
      </Card>
    </div>
  );
}
