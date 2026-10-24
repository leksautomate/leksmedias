"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  confirmEmailAction,
  forgotAction,
  loginAction,
  resendVerificationAction,
  resetAction,
  signupAction,
  type FormState,
} from "@/app/(auth)/actions";

const initial: FormState = {};

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
      {pending ? "One moment..." : children}
    </button>
  );
}

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  hint,
  required = true,
  minLength,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block font-mono text-[11px] uppercase tracking-[0.14em] text-soft">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className="h-12 w-full rounded-xl border border-line-strong bg-bg px-4 text-base text-ink placeholder:text-mute focus:border-gold"
      />
      {hint && <p className="mt-2 text-xs text-mute">{hint}</p>}
    </div>
  );
}

function Status({ state }: { state: FormState }) {
  return (
    <>
      <p role="alert" className="min-h-5 text-sm text-bad">
        {state.error ?? ""}
      </p>
      {state.devLink && (
        <p className="rounded-lg border border-gold/30 bg-gold-soft p-3 font-mono text-xs leading-relaxed text-soft">
          Development mode: email is printed to the server log. Use this link instead:
          <br />
          <a href={state.devLink} className="break-all text-gold underline" data-testid="dev-link">
            {state.devLink}
          </a>
        </p>
      )}
    </>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signupAction, initial);
  if (state.done) {
    return (
      <div role="status" className="space-y-4">
        <p className="font-serif text-2xl text-white">Check your email</p>
        <p className="leading-relaxed text-soft">{state.message}</p>
        <Status state={state} />
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5">
      <Field label="Name (optional)" name="name" autoComplete="name" required={false} defaultValue={state.name} />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.email} />
      <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={10} hint="At least 10 characters." />
      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 opacity-0" />
      <label className="flex items-start gap-3 text-sm leading-relaxed text-soft">
        <input type="checkbox" name="terms" required className="mt-1 h-4 w-4 accent-[#b8965a]" />
        <span>
          I agree to the{" "}
          <Link href="/terms" target="_blank" className="text-gold underline underline-offset-4">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="text-gold underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <Status state={state} />
      <Submit>Create account</Submit>
    </form>
  );
}

export function LoginForm({ next, resetDone }: { next?: string; resetDone?: boolean }) {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-5">
      {resetDone && (
        <p role="status" className="rounded-lg border border-good/30 bg-good/10 p-3 text-sm text-good">
          Password changed. Sign in with your new password.
        </p>
      )}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" />
      <p className="-mt-2 text-right text-sm">
        <Link href="/forgot" className="text-soft underline underline-offset-4 hover:text-white">
          Forgot your password?
        </Link>
      </p>
      <Status state={state} />
      <Submit>Sign in</Submit>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotAction, initial);
  if (state.done) {
    return (
      <div role="status" className="space-y-4">
        <p className="leading-relaxed text-soft">{state.message}</p>
        <Status state={state} />
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5">
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.email} />
      <Status state={state} />
      <Submit>Send reset link</Submit>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetAction, initial);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" minLength={10} hint="At least 10 characters." />
      <Status state={state} />
      <Submit>Change password</Submit>
    </form>
  );
}

/** A button instead of auto-confirming on page load, so email scanners that open links cannot use them up. */
export function ConfirmForm({ token }: { token: string }) {
  const [state, action] = useActionState(confirmEmailAction, initial);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <Status state={state} />
      <Submit>Confirm my email</Submit>
    </form>
  );
}

export function ResendForm() {
  const [state, action] = useActionState(async () => resendVerificationAction(), initial);
  return (
    <form action={action} className="space-y-4">
      <Status state={state} />
      {state.message && <p role="status" className="text-sm text-good">{state.message}</p>}
      <button type="submit" className="btn btn-ghost w-full">
        Send a new link
      </button>
    </form>
  );
}
