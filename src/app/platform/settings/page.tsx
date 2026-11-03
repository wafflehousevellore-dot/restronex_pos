import { Card, CardContent } from "@/components/ui/card";

export default function PlatformSettings() {
  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black text-[#172B25]">Platform Settings</h1>
        <p className="text-sm text-[#718078]">
          Global server configurations, environment status, and system health.
        </p>
      </div>
      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardContent className="pt-6 pb-6 text-sm text-[#718078] leading-relaxed">
          System health, integration registry, and automated backups are configured via server
          environment variables. Zero client-side sensitive keys.
        </CardContent>
      </Card>
    </div>
  );
}
