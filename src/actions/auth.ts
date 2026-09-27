"use server";

import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

export async function loginAction(raw: unknown) {
  const input = loginSchema.parse(raw);

  // Rate limit: 5 attempts / min per email + per IP-ish (email key here)
  const rl = await rateLimit(rateLimitKey("login", input.email.toLowerCase()), 5, 60_000);
  if (!rl.ok) return { ok: false, error: "Too many attempts. Please try again in a minute." };

  try {
    await signIn("credentials", {
      email: input.email.toLowerCase().trim(),
      password: input.password,
      rememberMe: input.rememberMe ? "true" : "false",
      redirect: false,
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: "Invalid email or password." };
    throw e;
  }
}

export async function requestPasswordReset(email: string) {
  const rl = await rateLimit(rateLimitKey("pwreset", email.toLowerCase()), 3, 300_000);
  if (!rl.ok) return { ok: true }; // do not leak enumeration; silently throttle

  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: {
        email: user.email!,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1h
      },
    });
    // TODO: send email via provider. Log token in dev only.
    if (process.env.NODE_ENV === "development") console.log(`[pw-reset] ${email}: ${token}`);
  }
  return { ok: true }; // always generic response (anti-enumeration)
}

export async function resetPassword(token: string, newPassword: string) {
  if (newPassword.length < 8) return { ok: false, error: "Minimum 8 characters." };
  const rec = await db.passwordResetToken.findUnique({ where: { token } });
  if (!rec || rec.usedAt || rec.expires < new Date()) {
    return { ok: false, error: "Invalid or expired token." };
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await db.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { email: rec.email },
      data: { passwordHash: hash },
    });
    await tx.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  });
  return { ok: true };
}
