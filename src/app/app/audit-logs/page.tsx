"use client";

import { AuditLogsTab } from "@/components/app/reports/AuditLogsTab";

export default function AuditLogsPage() {
  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Security & Operational Audit Logs</h1>
        <p className="text-sm text-[#718078]">
          Immutable, tamper-resistant audit records across orders, staff, menu pricing, inventory and configuration.
        </p>
      </div>

      <AuditLogsTab />
    </div>
  );
}
