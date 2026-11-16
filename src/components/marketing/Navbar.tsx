"use client";
import Link from "next/link";
import { useState } from "react";
import { navLinks } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown, Building2, UtensilsCrossed } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const mobileLinks = [
    { label: "POS", href: "/poss" },
    { label: "Features", href: "/features" },
    { label: "Solutions", href: "/solutions" },
    { label: "Pricing", href: "/pricing" },
    { label: "Integrations", href: "/integrations" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 border-b border-[#E5EBE7] backdrop-blur-md shadow-xs">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-[68px] items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Logo variant="light" />
          </Link>

          {/* Desktop nav — centered */}
          <nav className="hidden lg:flex items-center gap-1">
            {(navLinks as any).map((link: any) =>
              link.children ? (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(link.label)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <Link
                    href={link.href}
                    className="flex items-center gap-1 rounded-full px-3.5 py-2 text-[14px] font-medium text-[#718078] hover:text-[#172B25] hover:bg-[#E8F5EE]/60 transition-colors"
                  >
                    {link.label} <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Link>
                  {openDropdown === link.label && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2">
                      <div className="w-[540px] max-h-[85vh] overflow-y-auto rounded-2xl border border-[#E5EBE7] bg-white p-3 shadow-xl">
                        <div className="grid grid-cols-2 gap-1.5">
                          {link.children.map((c: any) => (
                            <Link
                              key={c.href}
                              href={c.href}
                              className="rounded-xl px-4 py-2.5 hover:bg-[#F8FAF9] transition-colors group"
                            >
                              <div className="text-[13px] font-semibold text-[#172B25] group-hover:text-[#16845B]">{c.label}</div>
                              <div className="text-[11px] text-[#718078] mt-0.5">Explore capability & workflows</div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-3.5 py-2 text-[14px] font-medium text-[#718078] hover:text-[#172B25] hover:bg-[#E8F5EE]/60 transition-colors"
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            {/* Direct Staff Portal Link */}
            <Link
              href="/staff/login"
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium text-[#718078] hover:text-[#16845B] hover:bg-[#E8F5EE]/60 transition-colors"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#16845B]" />
              <span>Staff Portal</span>
            </Link>

            {/* Owner Login with Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setOpenDropdown("login")}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <Link
                href="/owner/login"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E5EBE7] bg-white px-4 py-2 text-[13px] font-semibold text-[#172B25] hover:bg-[#F8FAF9] hover:border-[#16845B] transition-colors shadow-xs"
              >
                <Building2 className="w-3.5 h-3.5 text-[#16845B]" />
                <span>Owner Login</span>
                <ChevronDown className="h-3 w-3 text-[#718078]" />
              </Link>

              {openDropdown === "login" && (
                <div className="absolute right-0 top-full pt-2 z-50">
                  <div className="w-[320px] rounded-2xl border border-[#E5EBE7] bg-white p-2.5 shadow-xl">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078] px-2.5 py-1.5">
                      Select Login Portal
                    </div>
                    <div className="space-y-1">
                      <Link
                        href="/owner/login"
                        className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-[#F8FAF9] transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#E8F5EE] border border-[#16845B]/20 flex items-center justify-center shrink-0 text-[#16845B]">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-[#172B25] group-hover:text-[#16845B] flex items-center justify-between">
                            <span>Restaurant Owner</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#E8F5EE] text-[#16845B]">Admin</span>
                          </div>
                          <div className="text-[11px] text-[#718078] mt-0.5 leading-snug">
                            Billing, menu, outlets, staff &amp; reports
                          </div>
                        </div>
                      </Link>

                      <Link
                        href="/staff/login"
                        className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-[#F8FAF9] transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#E8F5EE] border border-[#16845B]/20 flex items-center justify-center shrink-0 text-[#16845B]">
                          <UtensilsCrossed className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-[#172B25] group-hover:text-[#16845B] flex items-center justify-between">
                            <span>Staff Member</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#E8F5EE] text-[#16845B]">POS / KDS</span>
                          </div>
                          <div className="text-[11px] text-[#718078] mt-0.5 leading-snug">
                            Fast POS billing, kitchen display &amp; tables
                          </div>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link href="/get-started">
              <Button size="sm" className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white border-0 text-[13px] font-bold h-9 px-5 shadow-sm">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden rounded-xl p-2.5 text-[#172B25] hover:bg-[#F8FAF9] transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden bg-white border-t border-[#E5EBE7] shadow-lg">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
            <nav className="flex flex-col divide-y divide-[#E5EBE7]">
              {mobileLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-4 text-[15px] font-medium text-[#172B25] hover:text-[#16845B] transition-colors flex items-center justify-between"
                >
                  {l.label}
                  <span className="text-[#718078]">›</span>
                </Link>
              ))}
            </nav>
            <div className="mt-6 flex flex-col gap-2.5 pt-4 border-t border-[#E5EBE7]">
              <div className="text-[11px] font-bold text-[#718078] uppercase tracking-wider px-1">
                Sign In to Workspace
              </div>
              <Link
                href="/owner/login"
                onClick={() => setOpen(false)}
                className="w-full flex items-center justify-between rounded-2xl border border-[#E5EBE7] bg-white p-3.5 text-[14px] font-semibold text-[#172B25] hover:border-[#16845B] transition shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E8F5EE] border border-[#16845B]/20 flex items-center justify-center text-[#16845B]">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-[13px] font-semibold text-[#172B25]">Restaurant Owner Login</div>
                    <div className="text-[11px] text-[#718078]">Admin &amp; Business Management</div>
                  </div>
                </div>
                <span className="text-xs text-[#718078]">Admin →</span>
              </Link>
              <Link
                href="/staff/login"
                onClick={() => setOpen(false)}
                className="w-full flex items-center justify-between rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-3.5 text-[14px] font-semibold text-[#172B25] hover:border-[#16845B] transition shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E8F5EE] border border-[#16845B]/20 flex items-center justify-center text-[#16845B]">
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-[13px] font-semibold text-[#172B25]">Staff Portal Login</div>
                    <div className="text-[11px] text-[#718078]">POS Terminal, Kitchen &amp; Tables</div>
                  </div>
                </div>
                <span className="text-xs text-[#718078]">POS / KDS →</span>
              </Link>
              <Link
                href="/get-started"
                onClick={() => setOpen(false)}
                className="w-full text-center rounded-full bg-[#16845B] py-3 text-[14px] font-bold text-white shadow-sm mt-1"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
