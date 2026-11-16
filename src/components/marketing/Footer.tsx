import Link from "next/link";
import { brand } from "@/lib/brand";
import { Logo } from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="bg-white text-[#172B25] border-t border-[#E5EBE7]">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="inline-block"><Logo variant="light" /></Link>
            <p className="mt-3 text-sm text-[#718078] leading-6">{brand.description} Built for India&apos;s restaurants — secure, fast, and offline-ready.</p>
            <div className="mt-4 text-xs text-[#718078] leading-relaxed space-y-1">
              <div>{brand.contact.address}</div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <a href={brand.contact.mailtoUrl} className="hover:text-[#16845B] underline-offset-2 hover:underline font-medium">
                  {brand.contact.email}
                </a>
                <span>•</span>
                <a href={brand.contact.telUrl} className="hover:text-[#16845B] underline-offset-2 hover:underline font-medium">
                  {brand.contact.phone}
                </a>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-[#E5EBE7] bg-[#E8F5EE] text-[#16845B] px-3 py-1 font-medium">POS • Billing • KOT/KDS</span>
              <span className="rounded-full border border-[#E5EBE7] bg-[#E8F5EE] text-[#16845B] px-3 py-1 font-medium">Inventory • Reports</span>
              <span className="rounded-full border border-[#E5EBE7] bg-[#E8F5EE] text-[#16845B] px-3 py-1 font-medium">Multi-outlet</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-[#172B25]">Product</div>
            <ul className="mt-3 space-y-2 text-sm text-[#718078]">
              <li><Link href="/poss" className="hover:text-[#16845B] transition-colors">POS Overview</Link></li>
              <li><Link href="/features" className="hover:text-[#16845B] transition-colors">Features</Link></li>
              <li><Link href="/integrations" className="hover:text-[#16845B] transition-colors">Integrations</Link></li>
              <li><Link href="/pricing" className="hover:text-[#16845B] transition-colors">Pricing</Link></li>
              <li><Link href="/solutions" className="hover:text-[#16845B] transition-colors">Solutions</Link></li>
              <li><Link href="/owner/login" className="hover:text-[#16845B] transition-colors font-medium">Owner Portal</Link></li>
              <li><Link href="/staff/login" className="hover:text-[#16845B] transition-colors font-medium">Staff Portal</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-bold text-[#172B25]">Company</div>
            <ul className="mt-3 space-y-2 text-sm text-[#718078]">
              <li><Link href="/about" className="hover:text-[#16845B] transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-[#16845B] transition-colors">Contact</Link></li>
              <li><Link href="/book-demo" className="hover:text-[#16845B] transition-colors">Book Demo</Link></li>
              <li><Link href="/faq" className="hover:text-[#16845B] transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-bold text-[#172B25]">Subscribe Newsletter</div>
            <div className="mt-3 flex gap-2">
              <input placeholder="Enter Your Email..." className="flex-1 rounded-full border border-[#E5EBE7] bg-[#F8FAF9] px-4 py-2.5 text-sm placeholder:text-[#718078] text-[#172B25] outline-none focus:border-[#16845B] focus:bg-white" />
              <button className="rounded-full bg-[#16845B] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#116B49] transition-colors shadow-xs">Subscribe</button>
            </div>
            <div className="mt-4 text-xs text-[#718078] flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Support:</span>
              <a href={brand.contact.mailtoUrl} className="hover:text-[#16845B] underline-offset-2 hover:underline font-medium">
                {brand.contact.supportEmail}
              </a>
              <span>•</span>
              <a href={brand.contact.telUrl} className="hover:text-[#16845B] underline-offset-2 hover:underline font-medium">
                {brand.contact.phone}
              </a>
              <span>•</span>
              <a
                href={brand.contact.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#16845B] hover:underline font-semibold"
              >
                WhatsApp Support
              </a>
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-8 w-8 rounded-full border border-[#E5EBE7] bg-[#F8FAF9] grid place-items-center text-xs font-semibold text-[#172B25]">f</div>
              <div className="h-8 w-8 rounded-full border border-[#E5EBE7] bg-[#F8FAF9] grid place-items-center text-xs font-semibold text-[#172B25]">𝕏</div>
              <div className="h-8 w-8 rounded-full border border-[#E5EBE7] bg-[#F8FAF9] grid place-items-center text-xs font-semibold text-[#172B25]">in</div>
              <div className="h-8 w-8 rounded-full border border-[#E5EBE7] bg-[#F8FAF9] grid place-items-center text-xs font-semibold text-[#172B25]">▶</div>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-[#E5EBE7] pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-[#718078]">
          <div>© {new Date().getFullYear()} RestroNex. All rights reserved.</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/terms" className="hover:text-[#16845B] transition-colors">Terms &amp; Conditions</Link>
            <Link href="/privacy" className="hover:text-[#16845B] transition-colors">Privacy Policy</Link>
            <Link href="/refund-policy" className="hover:text-[#16845B] transition-colors">Refund Policy</Link>
            <Link href="/faq" className="hover:text-[#16845B] transition-colors">FAQ</Link>
            <span className="text-[#E5EBE7]" aria-hidden="true">|</span>
            <Link href="/owner/login" className="text-[#718078] hover:text-[#16845B] transition-colors font-medium">
              Owner Login
            </Link>
            <Link href="/staff/login" className="text-[#718078] hover:text-[#16845B] transition-colors font-medium">
              Staff Login
            </Link>
            <Link href="/platform" className="text-[#718078]/80 hover:text-[#16845B] transition-colors font-medium">
              Platform Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
