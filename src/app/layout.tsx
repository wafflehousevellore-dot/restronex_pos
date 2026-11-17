import type { Metadata } from "next";
import "./globals.css";
import { brand } from "@/lib/brand";
import E2BTokenSync from "@/components/E2BTokenSync";
import { ClerkProvider } from "@clerk/nextjs";
import JsonLd from "@/components/marketing/JsonLd";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.restronexpos.com"),
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s | ${brand.name}`,
  },
  description: brand.description,
  keywords: [
    "restaurant POS software India",
    "cloud restaurant billing",
    "KOT KDS system",
    "restaurant inventory software",
    "table QR ordering",
    "WhatsApp digital invoices",
    "multi-outlet restaurant POS",
    "thermal printer billing",
  ],
  authors: [{ name: "RestroNex Technologies", url: "https://www.restronexpos.com" }],
  creator: "RestroNex",
  publisher: "RestroNex",
  applicationName: "RestroNex POS",
  alternates: {
    canonical: "https://www.restronexpos.com",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://www.restronexpos.com",
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.description,
    siteName: "RestroNex Restaurant OS",
    images: [
      {
        url: "/images/pos-billing-terminal.jpg",
        width: 1200,
        height: 630,
        alt: "RestroNex POS Touch Billing Terminal and Receipt Printer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.description,
    images: ["/images/pos-billing-terminal.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full light" style={{ colorScheme: "light" }}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <JsonLd />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-[#F8FAF9] text-[#172B25]">
        <ClerkProvider
          taskUrls={{
            "choose-organization": "/staff/auth-callback",
          }}
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
