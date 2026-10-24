import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/Forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title={<>Choose a new <em>password.</em></>}>
      {token ? (
        <ResetForm token={token} />
      ) : (
        <p className="text-soft">
          This link is missing its token.{" "}
          <Link href="/forgot" className="text-gold underline underline-offset-4">
            Request a new one
          </Link>
          .
        </p>
      )}
    </AuthShell>
  );
}
