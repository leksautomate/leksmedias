import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { isDemoMode } from "@/lib/providers";
import { requireVerifiedUser } from "@/lib/server/dal";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Leksmedia" }, robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireVerifiedUser();
  return (
    <AppShell user={user} demo={isDemoMode()}>
      {children}
    </AppShell>
  );
}
