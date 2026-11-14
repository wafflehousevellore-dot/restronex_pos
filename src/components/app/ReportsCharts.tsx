"use client";

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

interface DayPoint {
  date: string;
  label: string;
  salesPaise: number;
  orders: number;
  taxPaise: number;
}

interface HourPoint {
  hour: number;
  label: string;
  orders: number;
  salesPaise: number;
}

function formatINRCompact(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}k`;
  return `₹${Math.round(rupees)}`;
}

export function SalesTrendChart({ data }: { data: DayPoint[] }) {
  const chartData = data.map((d) => ({
    ...d,
    revenueInr: Number((d.salesPaise / 100).toFixed(2)),
    taxInr: Number((d.taxPaise / 100).toFixed(2)),
  }));

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[#718078] border border-dashed border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
        No daily revenue data yet for this period.
      </div>
    );
  }

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="restroRevenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16845B" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#16845B" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5EBE7" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#718078" }}
            tickLine={false}
            axisLine={{ stroke: "#E5EBE7" }}
            minTickGap={20}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#718078" }}
            tickLine={false}
            axisLine={false}
            width={54}
            tickFormatter={(v) => formatINRCompact(Number(v || 0) * 100)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderColor: "#E5EBE7",
              borderRadius: "12px",
              fontSize: "12px",
              color: "#172B25",
            }}
            formatter={(value, name) => {
              const num = Number(value || 0);
              if (name === "orders") return [`${num} orders`, "Orders"];
              return [`₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name === "taxInr" ? "GST" : "Sales"];
            }}
          />
          <Area
            type="monotone"
            dataKey="revenueInr"
            name="Sales"
            stroke="#16845B"
            strokeWidth={2.5}
            fill="url(#restroRevenueGrad)"
            activeDot={{ r: 5, fill: "#16845B" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HourlyTrafficChart({
  data,
  timeZone,
}: {
  data: HourPoint[];
  timeZone: string;
}) {
  const chartData = data.map((h) => ({
    ...h,
    revenueInr: Number((h.salesPaise / 100).toFixed(2)),
    shortHour: `${String(h.hour).padStart(2, "0")}h`,
  }));

  const hasAnyOrders = chartData.some((h) => h.orders > 0);
  if (!hasAnyOrders) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[#718078] border border-dashed border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
        No hourly order traffic recorded yet ({timeZone}).
      </div>
    );
  }

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5EBE7" vertical={false} />
          <XAxis
            dataKey="shortHour"
            tick={{ fontSize: 10, fill: "#718078" }}
            tickLine={false}
            axisLine={{ stroke: "#E5EBE7" }}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#718078" }}
            tickLine={false}
            axisLine={false}
            width={48}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderColor: "#E5EBE7",
              borderRadius: "12px",
              fontSize: "12px",
              color: "#172B25",
            }}
            labelFormatter={(label) => `Hour ${label} (${timeZone})`}
            formatter={(value, name) => {
              const num = Number(value || 0);
              if (name === "orders") return [`${num} orders`, "Orders"];
              return [`₹${num.toLocaleString("en-IN")}`, "Revenue"];
            }}
          />
          <Bar
            dataKey="orders"
            name="orders"
            fill="#16845B"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
