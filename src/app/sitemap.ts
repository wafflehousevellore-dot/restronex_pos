import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.restronexpos.com";
  const now = new Date();

  // Core public landing routes
  const routes: { path: string; priority: number; changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never" }[] = [
    // Primary Landing Pages
    { path: "", priority: 1.0, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.95, changeFrequency: "weekly" },
    { path: "/poss", priority: 0.9, changeFrequency: "weekly" },
    { path: "/features", priority: 0.85, changeFrequency: "weekly" },
    { path: "/solutions", priority: 0.85, changeFrequency: "weekly" },
    { path: "/integrations", priority: 0.8, changeFrequency: "weekly" },
    { path: "/about", priority: 0.75, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.8, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
    { path: "/book-demo", priority: 0.8, changeFrequency: "weekly" },
    { path: "/get-started", priority: 0.85, changeFrequency: "weekly" },

    // Feature Deep Dive Pages
    { path: "/features/pos", priority: 0.8, changeFrequency: "weekly" },
    { path: "/features/kitchen-display", priority: 0.8, changeFrequency: "weekly" },
    { path: "/features/qr-ordering", priority: 0.8, changeFrequency: "weekly" },
    { path: "/features/waiter-ordering", priority: 0.75, changeFrequency: "weekly" },
    { path: "/features/inventory", priority: 0.8, changeFrequency: "weekly" },
    { path: "/features/menu-management", priority: 0.75, changeFrequency: "weekly" },
    { path: "/features/table-management", priority: 0.75, changeFrequency: "weekly" },
    { path: "/features/purchase-management", priority: 0.75, changeFrequency: "weekly" },
    { path: "/features/crm-loyalty", priority: 0.75, changeFrequency: "weekly" },
    { path: "/features/reports", priority: 0.8, changeFrequency: "weekly" },
    { path: "/features/multi-outlet", priority: 0.8, changeFrequency: "weekly" },
    { path: "/features/printers", priority: 0.75, changeFrequency: "weekly" },
    { path: "/features/whatsapp-invoices", priority: 0.8, changeFrequency: "weekly" },
    { path: "/features/staff-management", priority: 0.75, changeFrequency: "weekly" },
    { path: "/features/head-office", priority: 0.7, changeFrequency: "weekly" },
    { path: "/features/online-ordering", priority: 0.75, changeFrequency: "weekly" },

    // Solution Specific Pages
    { path: "/solutions/fine-dine", priority: 0.75, changeFrequency: "weekly" },
    { path: "/solutions/cafes", priority: 0.75, changeFrequency: "weekly" },
    { path: "/solutions/qsr", priority: 0.75, changeFrequency: "weekly" },
    { path: "/solutions/bakeries", priority: 0.75, changeFrequency: "weekly" },
    { path: "/solutions/pizzerias", priority: 0.75, changeFrequency: "weekly" },
    { path: "/solutions/dessert-shops", priority: 0.75, changeFrequency: "weekly" },
    { path: "/solutions/food-courts", priority: 0.75, changeFrequency: "weekly" },
    { path: "/solutions/cloud-kitchens", priority: 0.75, changeFrequency: "weekly" },
    { path: "/solutions/chains", priority: 0.75, changeFrequency: "weekly" },

    // Trust, Compliance & Legal Pages
    { path: "/terms", priority: 0.5, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.5, changeFrequency: "monthly" },
    { path: "/refund-policy", priority: 0.5, changeFrequency: "monthly" },
  ];

  return routes.map((r) => ({
    url: `${baseUrl}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
