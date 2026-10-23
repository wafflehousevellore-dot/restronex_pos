import { PageShell } from "@/components/marketing/PageShell";
import Link from "next/link";

export default function Page(){
  const bullets = [
"KOT stations & printers", "Auto-fire on bill", "Bump & recall workflow", "Live sync polling fallback", "Station-wise queue", "KOT reprint & audit"
  ] as const;
  const flows = [
"Fire KOT → station receives → bump → serve → close"
  ] as const;
  return (
    <PageShell title="KOT & Kitchen Display" subtitle="Tickets that flow, never lost" badge="Feature • RestroNex">
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="text-sm font-bold text-white">What&apos;s included</div>
          <ul className="mt-4 space-y-3 text-sm text-white/70">{bullets.map(b=> <li key={b} className="flex gap-3"><span className="text-[#3D954F]">✓</span>{b}</li>)}</ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="text-sm font-bold text-white">How it works</div>
          <ol className="mt-4 list-decimal pl-5 space-y-2 text-sm text-white/70">{flows.map((s,i)=> <li key={i}>{s}</li>)}</ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/sign-up" className="rounded-full bg-[#3D954F] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#2e7a3e]">Get started</Link>
            <Link href="/book-demo" className="rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10">Book demo</Link>
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60 backdrop-blur">
        Original content and visuals. KOT & Kitchen Display is built on normalized DB, tenant-isolated, audit-logged, and permission-checked.
      </div>
    </PageShell>
  );
}
