import React from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Zap,
  Coffee,
  CloudSun,
  CakeSlice,
  Pizza,
  IceCream2,
  Beer,
  Store,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function OutletTypesSection() {
  const formats = [
    {
      name: "Fine Dine",
      slug: "/solutions/fine-dine",
      icon: UtensilsCrossed,
      tag: "Hospitality & Elegance",
      desc: "Multi-course pacing, sommelier wine notes, split billing by seat, and reservation timeline management.",
    },
    {
      name: "QSR & Fast Food",
      slug: "/solutions/qsr",
      icon: Zap,
      tag: "Speed & Throughput",
      desc: "3-click counter tokens, kitchen bump-bars, customer pickup number displays, and rapid combo modifiers.",
    },
    {
      name: "Cafes & Coffee",
      slug: "/solutions/cafes",
      icon: Coffee,
      tag: "Counter & Ambiance",
      desc: "Bean & dairy consumption tracking, barista KOT routing, loyalty cards, and seamless digital payment queues.",
    },
    {
      name: "Cloud Kitchens",
      slug: "/solutions/cloud-kitchens",
      icon: CloudSun,
      tag: "Virtual Multi-Brand",
      desc: "Operate 5+ virtual restaurant brands from one kitchen. Centralized menu dispatch and packaging stock tracking.",
    },
    {
      name: "Bakeries & Cakes",
      slug: "/solutions/bakeries",
      icon: CakeSlice,
      tag: "Batches & Shelf-Life",
      desc: "Batch production expiry tracking, custom celebration cake pre-orders, and raw material ingredient recipes.",
    },
    {
      name: "Pizzerias & Italian",
      slug: "/solutions/pizzerias",
      icon: Pizza,
      tag: "Custom Modifiers",
      desc: "Crust types, custom toppings, half-and-half pizza modifiers, combo promotions, and delivery fleet dispatch.",
    },
    {
      name: "Desserts & Parlors",
      slug: "/solutions/dessert-shops",
      icon: IceCream2,
      tag: "High Rush Checkout",
      desc: "Flavor scoops, toppings bar addons, weight-based minor-unit calculations, and contactless QR payments.",
    },
    {
      name: "Bars & Breweries",
      slug: "/solutions/bars-breweries",
      icon: Beer,
      tag: "Liquor Inventory & Tabs",
      desc: "Keg volume depletion, ML-level bottle tracking, open bar tabs, happy hour rules, and separate beverage KOTs.",
    },
    {
      name: "Food Courts & Hubs",
      slug: "/solutions/food-courts",
      icon: Store,
      tag: "Multi-Vendor Cashiers",
      desc: "Central food court cashiering, prepaid card wallets, tenant revenue share reconciliation, and token pickup screens.",
    },
    {
      name: "Large Multi-Chains",
      slug: "/solutions/chains",
      icon: Layers,
      tag: "Centralized Enterprise",
      desc: "Central recipe catalogs, outlet-level price overrides, inter-outlet stock transfers, and aggregated analytics.",
    },
  ];

  return (
    <section className="py-20 bg-white border-b border-[#E5EBE7]">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20">
            OUTLET TYPES & FORMATS
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-black text-[#172B25] tracking-tight">
            Built for All Types of Food Businesses
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#718078] leading-relaxed">
            Every food service concept has unique operational rhythms. RestroNex provides dedicated workflows designed specifically for your format.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
          {formats.map((fmt, idx) => {
            const Icon = fmt.icon;
            return (
              <Link
                key={idx}
                href={fmt.slug}
                className="group p-5 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] hover:border-[#16845B] hover:bg-white hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="h-11 w-11 rounded-xl bg-[#E8F5EE] text-[#16845B] flex items-center justify-center group-hover:bg-[#16845B] group-hover:text-white transition-colors duration-300 mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#16845B]">
                    {fmt.tag}
                  </span>
                  <h3 className="text-sm font-bold text-[#172B25] mt-1 group-hover:text-[#16845B] transition-colors">
                    {fmt.name}
                  </h3>
                  <p className="text-[11px] text-[#718078] mt-2 leading-relaxed">
                    {fmt.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5EBE7] flex items-center justify-between text-[11px] font-bold text-[#16845B]">
                  <span>Explore format</span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
