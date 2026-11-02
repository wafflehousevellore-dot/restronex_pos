import Navbar from "./Navbar";
import Footer from "./Footer";
import Link from "next/link";

export function PageShell({ title, subtitle, children, badge }: { title: string; subtitle?: string; children: React.ReactNode; badge?: string }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9] text-[#172B25]">
      <Navbar />
      <main className="flex-1 bg-[#F8FAF9] text-[#172B25]">
        {/* Hero — Clean Light with subtle emerald accent tint */}
        <section className="relative overflow-hidden border-b border-[#E5EBE7] bg-gradient-to-b from-[#E8F5EE]/50 via-[#F8FAF9] to-[#F8FAF9]">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-[#16845B]/5 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#16845B]/5 blur-[100px] pointer-events-none" />
          <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            {badge && (
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E5EBE7] bg-[#E8F5EE] px-3.5 py-1 text-xs font-semibold text-[#16845B]">
                <span className="h-2 w-2 rounded-full bg-[#16845B] animate-pulse" /> {badge}
              </div>
            )}
            <h1 className="mt-3 text-[32px] sm:text-[40px] lg:text-[46px] font-black tracking-tight leading-[1.05] text-[#172B25]">
              {title}
            </h1>
            {subtitle && <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#718078]">{subtitle}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/sign-up" className="rounded-full bg-[#16845B] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#116B49] shadow-sm transition">
                Get Started →
              </Link>
              <Link href="/book-demo" className="rounded-full border border-[#E5EBE7] bg-white px-6 py-2.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] shadow-xs transition">
                Book Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Partner strip — clean light */}
        <div className="bg-white border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-10 text-xs font-bold tracking-widest text-[#718078]">
              <span className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-[#E8F5EE] text-[#16845B] grid place-items-center text-[10px]">◆</span> Sitemark</span>
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
    </div>
  );
}
