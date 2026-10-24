import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/Forms";
import { getCurrentUser } from "@/lib/server/dal";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  if (await getCurrentUser()) redirect("/app");
  return (
    <AuthShell
      title={<>Welcome <em>back.</em></>}
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="text-gold underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm next={sp.next} resetDone={sp.reset === "1"} />
    </AuthShell>
  );
}
