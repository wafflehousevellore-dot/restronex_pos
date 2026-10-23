import Navbar from "./Navbar";
import Footer from "./Footer";
import Link from "next/link";

export function PageShell({ title, subtitle, children, badge }: { title: string; subtitle?: string; children: React.ReactNode; badge?: string }) {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-[#070B07] text-white">
        {/* Hero — Synko dark with green glows */}
        <section className="relative overflow-hidden border-b border-white/10 bg-[#070B07]">
          <div className="absolute -top-40 -right-40 h-[700px] w-[700px] rounded-full bg-[#3D954F]/20 blur-[120px]" />
          <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-[#A45F43]/10 blur-[120px]" />
          <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            {badge && (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                <span className="h-2 w-2 rounded-full bg-[#3D954F] animate-pulse" /> {badge}
              </div>
            )}
            <h1 className="mt-3 text-[32px] sm:text-[40px] lg:text-[44px] font-black tracking-tight leading-[0.95]">
              {title}
            </h1>
            {subtitle && <p className="mt-3 max-w-2xl text-[15px] leading-7 text-white/60">{subtitle}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/sign-up" className="rounded-full bg-[#3D954F] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#2e7a3e]">
                Get Started →
              </Link>
              <Link href="/book-demo" className="rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
                Book Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Partner strip — green gradient */}
        <div className="bg-gradient-to-r from-[#0a1a0f] via-[#14a353] to-[#0a1a0f] border-y border-white/10">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-10 text-xs font-bold tracking-widest text-white/90">
              <span className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-white/20 grid place-items-center text-[10px]">◆</span> Sitemark</span>
              <span>✦ Inspirex</span>
              <span>◎ PinPoint</span>
              <span>✧ Nextmove</span>
              <span>⬢ Fitteams</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-10">{children}</div>
      </main>
      <Footer />
    </>
  );
}
