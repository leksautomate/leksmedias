import type { Metadata } from "next";
import { LegalDoc } from "@/components/Legal";
import { PRIVACY } from "@/lib/legal-docs";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What information we collect, why, who we share it with and your rights.",
};

export default function Page() {
  return <LegalDoc doc={PRIVACY} />;
}
