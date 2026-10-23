"use client";
import Link from "next/link";
import { useState } from "react";
import { navLinks } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
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
    <header className="sticky top-0 z-50 w-full bg-[#070B07] border-b border-white/10 backdrop-blur-sm">
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
                    className="flex items-center gap-1 rounded-full px-3.5 py-2 text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {link.label} <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Link>
                  {openDropdown === link.label && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3">
                      <div className="w-[540px] max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0F1F14] p-3 shadow-2xl">
                        <div className="grid grid-cols-2 gap-1.5">
                          {link.children.map((c: any) => (
                            <Link
                              key={c.href}
                              href={c.href}
                              className="rounded-xl px-4 py-2.5 hover:bg-white/[0.08] transition-colors group"
                            >
                              <div className="text-[13px] font-semibold text-white group-hover:text-emerald-300">{c.label}</div>
                              <div className="text-[11px] text-white/50 mt-0.5">Explore capability & workflows</div>
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
                  className="rounded-full px-3.5 py-2 text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          {/* Desktop CTAs: Primary = Get Started, Secondary = Sign In */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <Link
              href="/sign-in"
              className="rounded-full border border-white/15 px-5 py-2 text-[13px] font-semibold text-white hover:bg-white/10 hover:border-white/25 transition-colors"
            >
              Sign in
            </Link>
            <Link href="/get-started">
              <Button size="sm" className="rounded-full bg-[#3D954F] hover:bg-[#338a44] text-white border-0 text-[13px] font-bold h-9 px-6 shadow-md">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden rounded-xl p-2.5 text-white hover:bg-white/10 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden bg-[#070B07] border-t border-white/10">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">
            <nav className="flex flex-col divide-y divide-white/[0.06]">
              {mobileLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-4 text-[16px] font-medium text-white hover:text-white/70 transition-colors flex items-center justify-between"
                >
                  {l.label}
                  <span className="text-white/20">›</span>
                </Link>
              ))}
            </nav>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/15 bg-white/[0.04] px-6 py-3.5 text-center text-sm font-semibold text-white"
              >
                Sign in
              </Link>
              <Link
                href="/get-started"
                onClick={() => setOpen(false)}
                className="rounded-full bg-[#3D954F] px-6 py-3.5 text-center text-sm font-bold text-white shadow-md"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
