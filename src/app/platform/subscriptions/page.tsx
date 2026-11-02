import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SubsAdmin(){
  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black text-[#172B25]">Subscriptions Management</h1>
        <p className="text-sm text-[#718078]">Tenant subscription life cycles, payment ledger, and status audits.</p>
      </div>
      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardContent className="pt-6 pb-6 text-sm text-[#718078] leading-relaxed">
          Renewal, trial, and past-due states are managed via Subscription.status. Razorpay webhooks are verified server-side with HMAC-SHA256 and deduplicated idempotently using WebhookEvent.eventId.
        </CardContent>
      </Card>
    </div>
  );
}
