import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/Forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <AuthShell
      title={<>Reset your <em>password.</em></>}
      subtitle="Enter your email and we will send you a link."
      footer={
        <Link href="/login" className="text-gold underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
