import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { ConfirmForm, ResendForm } from "@/components/auth/Forms";
import { getCurrentUser } from "@/lib/server/dal";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (token) {
    return (
      <AuthShell title={<>Confirm your <em>email.</em></>} subtitle="One click and your free credits are ready.">
        <ConfirmForm token={token} />
      </AuthShell>
    );
  }
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.emailVerifiedAt) redirect("/app");
  return (
    <AuthShell title={<>Check your <em>inbox.</em></>} subtitle={`We sent a confirmation link to ${user.email}.`}>
      <p className="mb-6 leading-relaxed text-soft">
        Open the link in that email to unlock your 300 free credits. It can take a minute, and it may land in spam.
      </p>
      <ResendForm />
    </AuthShell>
  );
}
