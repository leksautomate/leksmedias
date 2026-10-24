import { SITE } from "@/lib/site";

// Fill these in once. Every legal page reads from here, and anything left empty
// shows as a highlighted [placeholder] so it cannot be missed before launch.
export const LEGAL = {
  product: SITE.name,
  /** Legal name of the company that runs the service, e.g. "Leksmedia LLC". */
  entity: "",
  /** Registered or mailing address. */
  address: "",
  /** Support and privacy contact. */
  email: "",
  /** Governing law and courts, e.g. "the State of Delaware, USA". */
  jurisdiction: "",
  updated: "October 24, 2026",
} as const;

export type LegalKey = keyof typeof LEGAL;

export const PLACEHOLDER_LABEL: Record<LegalKey, string> = {
  product: "Product name",
  entity: "Legal entity name",
  address: "Company address",
  email: "Contact email",
  jurisdiction: "Governing law and courts",
  updated: "Date",
};

// Refund rules in one place so the policy page, FAQs and docs agree.
export const REFUND = {
  monthlyDays: 7,
  yearlyDays: 14,
  maxUsedPercent: 20,
  renewalWindowHours: 48,
  topUpDays: 7,
} as const;
