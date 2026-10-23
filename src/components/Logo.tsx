import Link from "next/link";

export function Logo({ variant = "light", size = "default", showText = true }: { variant?: "light" | "dark"; size?: "default" | "small"; showText?: boolean }) {
  const isLight = variant === "light";
  // Match uploaded image: dark square bg (#0A1A14 rounded), white R with fork negative space, green diagonal #3D954F
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className={`${size === "small" ? "h-8 w-8" : "h-9 w-9"} rounded-[10px] flex items-center justify-center shrink-0 ${isLight ? "bg-[#0B1A14]" : "bg-white"} shadow-sm overflow-hidden p-[3px]`}>
        <svg viewBox="0 0 36 36" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          {/* White R shape on dark bg - vertical stem + bowl */}
          <rect x="6" y="6" width="8" height="23.5" rx="3.5" fill={isLight ? "#ffffff" : "#061412"} />
          <path d="M14 6C14 6 14 5.5 17 5.5H22.5C29 5.5 32.5 9 32.5 13.8C32.5 18.6 29 21.8 23.5 21.8H16L14 6Z" fill={isLight ? "#ffffff" : "#061412"} />
          {/* Fork cutout - 3 tines inside R */}
          <g transform="translate(11, 10)">
            <path d="M4.8 0.2C4.5 0.2 4.2 0.5 4.2 1.1L4.2 7.5C4.2 7.5 4.2 8 3.7 8C3.2 8 3.2 7.5 3.2 7.5L3.2 1.3C3.2 0.7 2.9 0.1 2.4 0.1C1.9 0.1 1.6 0.7 1.6 1.3L1.6 7.5C1.6 7.5 1.6 8 1.1 8C0.6 8 0.6 7.5 0.6 7.5L0.6 1.1C0.6 0.5 0.3 0.2 0 0.2C-0.3 0.2 -0.6 0.5 -0.6 1.1L-0.6 7.8C-0.6 9 0.2 10.8 1.1 10.8H3.9C4.8 10.8 5.6 9 5.6 7.8L5.6 1.1C5.6 0.5 5.1 0.2 4.8 0.2Z" fill={isLight ? "#0B1A14" : "#ffffff"} />
          </g>
          {/* Green diagonal base */}
          <path d="M15.5 22L21 28H30.5L24.5 22H15.5Z" fill="#205836" />
          <path d="M16.5 23.2L22 28.8H29L23.5 23.2H16.5Z" fill="#3D954F" />
        </svg>
      </div>
      {showText && (
        <div>
          <div className={`text-[16px] font-black tracking-tight leading-none flex ${isLight ? "text-white" : "text-slate-900"}`}>
            <span>Restro</span><span className="text-[#3D954F]">Nex</span>
          </div>
          <div className={`text-[9.5px] font-bold tracking-[0.16em] uppercase leading-none mt-[3px] ${isLight ? "text-white/50" : "text-slate-500"}`}>Restaurant OS</div>
        </div>
      )}
    </div>
  );
}

export function LogoIcon({ size = 40 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="rounded-[12px] bg-[#0B1A14] flex items-center justify-center p-[4px] shadow-sm overflow-hidden">
      <svg viewBox="0 0 36 36" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="6" width="8" height="23.5" rx="3.5" fill="#ffffff" />
        <path d="M14 6C14 6 14 5.5 17 5.5H22.5C29 5.5 32.5 9 32.5 13.8C32.5 18.6 29 21.8 23.5 21.8H16L14 6Z" fill="#ffffff" />
        <g transform="translate(11, 10)">
          <path d="M4.8 0.2C4.5 0.2 4.2 0.5 4.2 1.1L4.2 7.5C4.2 7.5 4.2 8 3.7 8C3.2 8 3.2 7.5 3.2 7.5L3.2 1.3C3.2 0.7 2.9 0.1 2.4 0.1C1.9 0.1 1.6 0.7 1.6 1.3L1.6 7.5C1.6 7.5 1.6 8 1.1 8C0.6 8 0.6 7.5 0.6 7.5L0.6 1.1C0.6 0.5 0.3 0.2 0 0.2C-0.3 0.2 -0.6 0.5 -0.6 1.1L-0.6 7.8C-0.6 9 0.2 10.8 1.1 10.8H3.9C4.8 10.8 5.6 9 5.6 7.8L5.6 1.1C5.6 0.5 5.1 0.2 4.8 0.2Z" fill="#0B1A14" />
        </g>
        <path d="M15.5 22L21 28H30.5L24.5 22H15.5Z" fill="#205836" />
        <path d="M16.5 23.2L22 28.8H29L23.5 23.2H16.5Z" fill="#3D954F" />
      </svg>
    </div>
  );
}

export function LogoWithLink({ variant = "light" }: { variant?: "light" | "dark" }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <Logo variant={variant} />
    </Link>
  );
}
