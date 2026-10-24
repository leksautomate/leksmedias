import type { Metadata } from "next";
import { LegalDoc } from "@/components/Legal";
import { REFUNDS } from "@/lib/legal-docs";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "When credits and payments are refunded.",
};

export default function Page() {
  return <LegalDoc doc={REFUNDS} />;
}
