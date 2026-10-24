import { NextResponse } from "next/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  let body: { email?: unknown; company?: unknown; source?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: bots fill the hidden field. Pretend success.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !EMAIL.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  const source = typeof body.source === "string" ? body.source.slice(0, 40) : "unknown";

  const hook = process.env.WAITLIST_WEBHOOK_URL;
  if (!hook) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Sign-ups are not available right now." }, { status: 503 });
    }
    console.log("[waitlist:dev]", { email, source });
    return NextResponse.json({ ok: true });
  }

  try {
    const res = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source, at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(`webhook ${res.status}`);
  } catch {
    return NextResponse.json({ error: "Could not save your email. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
