import Link from "next/link";
import { brand } from "@/lib/brand";
import { Logo } from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="bg-[#070B07] text-white border-t border-white/10">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="inline-block"><Logo variant="light" /></Link>
            <p className="mt-3 text-sm text-white/60 leading-6">{brand.description} Built for India&apos;s restaurants — secure, fast, and offline-ready.</p>
            <div className="mt-4 text-xs text-white/30 leading-relaxed">{brand.contact.address} • {brand.contact.email} • {brand.contact.phone}</div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/40">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">POS • Billing • KOT/KDS</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Inventory • Reports</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Multi-outlet</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-bold">Product</div>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li><Link href="/poss" className="hover:text-white transition-colors">POS Overview</Link></li>
              <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/integrations" className="hover:text-white transition-colors">Integrations</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/solutions" className="hover:text-white transition-colors">Solutions</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-bold">Company</div>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/book-demo" className="hover:text-white transition-colors">Book Demo</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-bold">Subscribe Newsletter</div>
            <div className="mt-3 flex gap-2">
              <input placeholder="Enter Your Email..." className="flex-1 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm placeholder:text-white/40 text-white outline-none focus:border-[#3D954F] focus:bg-white/[0.08]" />
              <button className="rounded-full bg-[#3D954F] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#338a44] transition-colors">Subscribe</button>
            </div>
            <div className="mt-4 text-xs text-white/40">Support: support@restronex.app • +91 98765 43210 • 24×7</div>
            <div className="mt-4 flex gap-2">
              <div className="h-8 w-8 rounded-full bg-white/10 grid place-items-center text-xs">f</div>
              <div className="h-8 w-8 rounded-full bg-white/10 grid place-items-center text-xs">𝕏</div>
              <div className="h-8 w-8 rounded-full bg-white/10 grid place-items-center text-xs">in</div>
              <div className="h-8 w-8 rounded-full bg-white/10 grid place-items-center text-xs">▶</div>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between gap-3 text-xs text-white/40">
          <div>© 2025 RestroNex. All rights reserved.</div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link>
            <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
