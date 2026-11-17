import Link from "next/link";

interface LogoProps {
  variant?: "light" | "dark";
  size?: "default" | "small";
  showText?: boolean;
}

export function Logo({
  variant = "light",
  size = "default",
  showText = true,
}: LogoProps) {
  const isLight = variant === "light";

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className={`${
          size === "small" ? "h-8 w-8" : "h-9 w-9"
        } rounded-[10px] flex items-center justify-center shrink-0 overflow-hidden shadow-xs bg-[#0F1E19]`}
      >
        <img
          src="/icon.png"
          alt="RestroNex Logo"
          width={size === "small" ? 32 : 36}
          height={size === "small" ? 32 : 36}
          className="h-full w-full object-contain"
        />
      </div>

      {showText && (
        <div>
          <div
            className={`text-[17px] font-black tracking-tight leading-none flex ${
              isLight ? "text-[#172B25]" : "text-white"
            }`}
          >
            <span>Restro</span>
            <span className="text-[#16845B]">Nex</span>
          </div>
          <div
            className={`text-[10px] font-bold tracking-[0.16em] uppercase leading-none mt-[3px] ${
              isLight ? "text-[#718078]" : "text-white/60"
            }`}
          >
            Restaurant OS
          </div>
        </div>
      )}
    </div>
  );
}

export function LogoIcon({ size = 40 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-[12px] flex items-center justify-center shadow-xs overflow-hidden bg-[#0F1E19]"
    >
      <img
        src="/icon.png"
        alt="RestroNex Icon"
        width={size}
        height={size}
        className="h-full w-full object-contain"
      />
    </div>
  );
}

export function LogoWithLink({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <Logo variant={variant} />
    </Link>
  );
}
