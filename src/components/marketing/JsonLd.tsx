import React from "react";
import { brand, pricingPlans } from "@/lib/brand";

export default function JsonLd() {
  const baseUrl = "https://www.restronexpos.com";
  const starter = pricingPlans.find((p) => p.slug === "starter") || pricingPlans[0];
  const business = pricingPlans.find((p) => p.slug === "business") || pricingPlans[2];

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    legalName: "RestroNex",
    url: baseUrl,
    logo: `${baseUrl}/images/pos-billing-terminal.jpg`,
    description: brand.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Virupachipuram",
      addressLocality: "Vellore",
      addressRegion: "Tamil Nadu",
      postalCode: "632002",
      addressCountry: "IN",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+91-9513008467",
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: ["en", "ta", "hi"],
      },
      {
        "@type": "ContactPoint",
        telephone: "+91-9513008467",
        contactType: "technical support",
        areaServed: "IN",
        availableLanguage: ["en", "ta", "hi"],
      },
    ],
    email: brand.contact.supportEmail,
  };

  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "RestroNex POS",
    alternateName: "RestroNex Restaurant POS & Management Software",
    operatingSystem: "Cloud, Android, Windows, macOS, Linux, Chrome OS",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Restaurant Billing & Inventory System",
    url: baseUrl,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: String(starter.priceMonthly),
      highPrice: String(business.priceAnnual),
      offerCount: "3",
      priceValidUntil: "2027-12-31",
      offers: pricingPlans.map((plan) => ({
        "@type": "Offer",
        name: `${plan.name} Plan`,
        price: String(plan.priceMonthly),
        priceCurrency: "INR",
        billingDuration: "P1M",
        description: plan.tagline,
        url: `${baseUrl}/pricing`,
      })),
    },
    featureList: [
      "Paise-accurate POS Billing with CGST and SGST calculation",
      "Live Kitchen Display System (KDS) with KOT status tracking",
      "Contactless QR Table Ordering without app downloads",
      "Bill of Materials (BOM) Recipe-Level Inventory Depletion",
      "Official Meta WhatsApp Cloud API PDF Invoice Delivery",
      "Multi-Outlet Central Menu and Consolidated Financial Reporting",
      "ESC/POS Thermal Receipt Printing (Bluetooth, LAN Ethernet, USB)",
      "Strict Server-Side Multi-Tenant Data Isolation and RBAC",
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brand.name,
    url: baseUrl,
    description: brand.description,
    publisher: {
      "@type": "Organization",
      name: brand.name,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}
