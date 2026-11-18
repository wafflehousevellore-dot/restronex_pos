"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatINR } from "@/lib/money";

export interface TrendPoint {
  label: string;
  revenuePaise: number;
  orders: number;
  aovPaise: number;
}

function formatCompactINR(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}k`;
  return `₹${Math.round(rupees)}`;
}

export function RevenueTrendChart({ data }: { data: TrendPoint[] }) {
  const chartData = React.useMemo(() => {
    return data.map((d) => ({
      ...d,
      revenueInr: Number((d.revenuePaise / 100).toFixed(2)),
      aovInr: Number((d.aovPaise / 100).toFixed(2)),
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-xs text-[#718078] border border-dashed border-[#E5EBE7] rounded-2xl bg-[#F8FAF9]">
        No revenue data recorded for this selected time window.
      </div>
    );
  }

  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16845B" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#16845B" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5EBE7" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#718078" }}
            tickLine={false}
            axisLine={{ stroke: "#E5EBE7" }}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#718078" }}
            tickLine={false}
            axisLine={false}
            width={58}
            tickFormatter={(v) => formatCompactINR(Number(v || 0) * 100)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderColor: "#E5EBE7",
              borderRadius: "16px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
              fontSize: "12px",
              color: "#172B25",
              padding: "10px 14px",
            }}
            formatter={(val: any, name: any) => {
              const num = Number(val || 0);
              if (name === "Orders") return [`${num} orders`, "Order Count"];
              return [formatINR(Math.round(num * 100)), "Revenue"];
            }}
          />
          <Area
            type="monotone"
            dataKey="revenueInr"
            name="Revenue"
            stroke="#16845B"
            strokeWidth={2.5}
            fill="url(#revenueGrad)"
            activeDot={{ r: 5, fill: "#16845B", stroke: "#FFFFFF", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrderVolumeChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-xs text-[#718078] border border-dashed border-[#E5EBE7] rounded-2xl bg-[#F8FAF9]">
        No order data recorded for this selected time window.
      </div>
    );
  }

  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5EBE7" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#718078" }}
            tickLine={false}
            axisLine={{ stroke: "#E5EBE7" }}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#718078" }}
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderColor: "#E5EBE7",
              borderRadius: "16px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
              fontSize: "12px",
              color: "#172B25",
              padding: "10px 14px",
            }}
            formatter={(val: any) => [`${val} orders`, "Total Orders"]}
          />
          <Bar
            dataKey="orders"
            name="Orders"
            fill="#16845B"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AovTrendChart({ data }: { data: TrendPoint[] }) {
  const chartData = React.useMemo(() => {
    return data.map((d) => ({
      ...d,
      aovInr: Number((d.aovPaise / 100).toFixed(2)),
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-xs text-[#718078] border border-dashed border-[#E5EBE7] rounded-2xl bg-[#F8FAF9]">
        No AOV data recorded for this selected time window.
      </div>
    );
  }

  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="aovGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0284C7" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#0284C7" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5EBE7" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#718078" }}
            tickLine={false}
            axisLine={{ stroke: "#E5EBE7" }}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#718078" }}
            tickLine={false}
            axisLine={false}
            width={58}
            tickFormatter={(v) => formatCompactINR(Number(v || 0) * 100)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderColor: "#E5EBE7",
              borderRadius: "16px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
              fontSize: "12px",
              color: "#172B25",
              padding: "10px 14px",
            }}
            formatter={(val: any) => [formatINR(Math.round(Number(val) * 100)), "Average Order Value"]}
          />
          <Area
            type="monotone"
            dataKey="aovInr"
            name="AOV"
            stroke="#0284C7"
            strokeWidth={2.5}
            fill="url(#aovGrad)"
            activeDot={{ r: 5, fill: "#0284C7", stroke: "#FFFFFF", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OutletComparisonBarChart({
  data,
}: {
  data: { name: string; revenuePaise: number; orders: number }[];
}) {
  const chartData = React.useMemo(() => {
    return data.map((d) => ({
      name: d.name,
      revenueInr: Number((d.revenuePaise / 100).toFixed(2)),
      orders: d.orders,
    }));
  }, [data]);

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5EBE7" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#718078" }}
            tickLine={false}
            axisLine={{ stroke: "#E5EBE7" }}
            tickFormatter={(v) => formatCompactINR(Number(v || 0) * 100)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "#172B25", fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderColor: "#E5EBE7",
              borderRadius: "16px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
              fontSize: "12px",
              color: "#172B25",
              padding: "10px 14px",
            }}
            formatter={(val: any, name: any) => {
              if (name === "Orders") return [`${val} orders`, "Orders"];
              return [formatINR(Math.round(Number(val) * 100)), "Revenue"];
            }}
          />
          <Bar
            dataKey="revenueInr"
            name="Revenue"
            fill="#16845B"
            radius={[0, 6, 6, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
