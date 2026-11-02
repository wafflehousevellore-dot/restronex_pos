import type { Metadata } from "next";
import "./globals.css";
import { brand } from "@/lib/brand";
import E2BTokenSync from "@/components/E2BTokenSync";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description: brand.description,
  keywords: brand.meta.keywords,
  openGraph: {
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full light" style={{ colorScheme: "light" }}>
      <body className="min-h-full flex flex-col antialiased bg-[#F8FAF9] text-[#172B25]">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#16845B",
              colorBackground: "#FFFFFF",
              colorText: "#172B25",
              colorTextSecondary: "#718078",
              colorInputBackground: "#FFFFFF",
              colorInputText: "#172B25",
              borderRadius: "0.75rem",
            } as any,
            elements: {
              card: "bg-white border border-[#E5EBE7] shadow-lg rounded-2xl",
              headerTitle: "text-[#172B25] font-bold",
              headerSubtitle: "text-[#718078]",
              formButtonPrimary: "bg-[#16845B] hover:bg-[#116B49] text-white rounded-xl font-semibold shadow-xs",
              socialButtonsBlockButton: "border border-[#E5EBE7] bg-white text-[#172B25] hover:bg-[#F8FAF9] rounded-xl font-medium",
              formFieldInput: "bg-white border border-[#E5EBE7] text-[#172B25] rounded-xl focus:border-[#16845B]",
              footerActionLink: "text-[#16845B] hover:underline font-medium",
            },
          }}
        >
          <E2BTokenSync />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
