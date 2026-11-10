import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { softwareScreenshots } from "@/lib/brand";

export default function SoftwareShowcaseSection({ embedded = false }: { embedded?: boolean }) {
  const cards = (
    <div className="grid md:grid-cols-2 gap-6">
      {softwareScreenshots.map((item) => (
        <Link
          key={item.image}
          href={item.href}
          className="group rounded-3xl border border-[#E5EBE7] bg-white overflow-hidden shadow-xs hover:border-[#16845B] hover:shadow-md transition-all flex flex-col"
        >
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F8FAF9] border-b border-[#E5EBE7]">
            <Image
              src={item.image}
              alt={item.alt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            />
            <span className="absolute top-3 left-3 rounded-full bg-white/95 backdrop-blur-xs border border-[#E5EBE7] px-3 py-1 text-[11px] font-bold text-[#16845B] shadow-2xs">
              {item.badge}
            </span>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-base font-bold text-[#172B25] group-hover:text-[#16845B] transition-colors">
                {item.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#718078]">{item.desc}</p>
            </div>
            <div className="pt-1 inline-flex items-center gap-1 text-xs font-bold text-[#16845B]">
              <span>Explore Screen</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );

  if (embedded) {
    return (
      <div className="mt-12 space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold tracking-widest text-[#16845B] uppercase">SOFTWARE IN ACTION</span>
          <h2 className="mt-2 text-2xl font-black text-[#172B25]">Inside the RestroNex Platform</h2>
          <p className="mt-1.5 text-sm text-[#718078]">
            Clean, fast interfaces across front-of-house billing, kitchen KDS displays, guest QR menus, and owner analytics.
          </p>
        </div>
        {cards}
      </div>
    );
  }

  return (
    <section className="py-16 bg-[#F8FAF9] border-b border-[#E5EBE7]">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold tracking-widest text-[#16845B] uppercase">SOFTWARE GALLERY</span>
          <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#172B25]">
            Built for Real Dining Counters, Kitchens &amp; Owners
          </h2>
          <p className="mt-2 text-sm text-[#718078]">
            Explore how RestroNex looks in action — from 3-tap counter billing and 80mm printers to live KDS monitors and WhatsApp e-bills.
          </p>
        </div>
        <div className="mt-12">{cards}</div>
      </div>
    </section>
  );
}

