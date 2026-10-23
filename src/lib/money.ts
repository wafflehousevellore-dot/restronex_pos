// All currency in minor units (paise) — integer arithmetic only
export const PAISA_PER_RUPEE = 100;

export function toPaise(rupees: number): number {
  return Math.round(rupees * PAISA_PER_RUPEE);
}
export function toRupees(paise: number): number {
  return paise / PAISA_PER_RUPEE;
}
export function formatINR(paise: number, opts?: { compact?: boolean }): string {
  const rupees = paise / 100;
  if (opts?.compact && rupees >= 100000) return `₹${(rupees/100000).toFixed(1)}L`;
  if (opts?.compact && rupees >= 1000) return `₹${(rupees/1000).toFixed(1)}k`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(rupees);
}
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

// Tax calculation: rate in basis points (e.g. 500 = 5%)
export function calcTaxPaise(amountPaise: number, rateBps: number): number {
  return Math.round((amountPaise * rateBps) / 10000);
}
export function calcOrderTotals(params: {
  lineTotalsPaise: number[];
  discountPaise: number;
  taxRateBps: number;
  serviceChargeBps: number;
}) {
  const subtotal = params.lineTotalsPaise.reduce((a,b)=>a+b,0);
  const afterDiscount = Math.max(0, subtotal - params.discountPaise);
  const tax = calcTaxPaise(afterDiscount, params.taxRateBps);
  const service = calcTaxPaise(afterDiscount, params.serviceChargeBps);
  const total = afterDiscount + tax + service;
  return { subtotal, afterDiscount, tax, service, total };
}
