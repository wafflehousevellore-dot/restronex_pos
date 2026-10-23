import type { Metadata } from "next";
import "./globals.css";
import { brand } from "@/lib/brand";
import E2BTokenSync from "@/components/E2BTokenSync";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/themes";

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
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <E2BTokenSync />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
