import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
export function uid(prefix="id") { return `${prefix}_${Math.random().toString(36).slice(2,9)}_${Date.now().toString(36)}`; }
