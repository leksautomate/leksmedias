import type { Metadata } from "next";
import { LegalDoc } from "@/components/Legal";
import { TERMS } from "@/lib/legal-docs";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern using the service, credits, subscriptions and your scripts.",
};

export default function Page() {
  return <LegalDoc doc={TERMS} />;
}
