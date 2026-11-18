"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  showHome?: boolean;
  homeHref?: string;
}

export function Breadcrumbs({
  items,
  showHome = true,
  homeHref = "/app/dashboard",
  className,
  ...props
}: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-xs text-[#718078]", className)}
      {...props}
    >
      <ol className="flex items-center gap-1.5 flex-wrap">
        {showHome && (
          <li className="inline-flex items-center">
            <Link
              href={homeHref}
              className="inline-flex items-center gap-1 text-[#718078] hover:text-[#16845B] transition-colors font-medium"
              title="Dashboard Home"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only">Dashboard</span>
            </Link>
          </li>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const Icon = item.icon;

          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 text-[#A0ACA5] shrink-0" />
              {isLast || !item.href ? (
                <span
                  className={cn(
                    "font-semibold truncate max-w-[200px] sm:max-w-[320px]",
                    isLast ? "text-[#172B25]" : "text-[#718078]"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {Icon && <Icon className="h-3.5 w-3.5 inline mr-1" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="font-medium text-[#718078] hover:text-[#16845B] transition-colors truncate max-w-[160px]"
                >
                  {Icon && <Icon className="h-3.5 w-3.5 inline mr-1" />}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
