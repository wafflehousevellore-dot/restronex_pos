import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.restronexpos.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/app/",
          "/app",
          "/staff/",
          "/staff",
          "/owner/",
          "/owner",
          "/platform/",
          "/platform",
          "/checkout/",
          "/checkout",
          "/standard-checkout",
          "/order/",
          "/qr/",
          "/feedback/",
          "/api/",
          "/login",
          "/sign-in/",
          "/sign-up/",
          "/dashboard/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
