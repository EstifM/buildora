// Prices live here so the web app and the API agree on them.
// Display text (plan names, descriptions) lives in the i18n messages.
export type PlanId = "daily" | "weekly";

export interface PricingPlan {
  id: PlanId;
  priceBirr: number;
  durationDays: number;
}

export const PRICING_PLANS: readonly PricingPlan[] = [
  { id: "daily", priceBirr: 50, durationDays: 1 },
  { id: "weekly", priceBirr: 200, durationDays: 7 },
];
