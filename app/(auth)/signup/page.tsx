import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/Forms";
import { getCurrentUser } from "@/lib/server/dal";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/app");
  return (
    <AuthShell
      title={<>Start with <em>300 free credits.</em></>}
      subtitle="Enough for two standard scripts. No card required."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-gold underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
