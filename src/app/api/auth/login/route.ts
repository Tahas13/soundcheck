import { NextResponse } from "next/server";
import { DEMO_USERS, SESSION_COOKIE, SESSION_VALUE } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const user = DEMO_USERS.find((u) => u.email.toLowerCase() === (email ?? "").trim().toLowerCase() && u.password === password);
  if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  const res = NextResponse.json({ ok: true, name: user.name });
  res.cookies.set(SESSION_COOKIE, SESSION_VALUE, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}
