import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "./db";
import { users, type User } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendConfirmationEmail } from "./emailService";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export async function createUser(firstName: string, lastName: string, email: string, password: string, baseUrl: string): Promise<User> {
  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  if (existing.length > 0) {
    throw new Error("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const confirmToken = crypto.randomBytes(32).toString("hex");

  const [user] = await db.insert(users).values({
    firstName,
    lastName,
    email: email.toLowerCase(),
    passwordHash,
    confirmToken,
    emailConfirmed: false,
  }).returning();

  const confirmUrl = `${baseUrl}/api/auth/confirm/${confirmToken}`;
  sendConfirmationEmail(email, firstName, confirmUrl).catch(err => {
    console.error("Email send error:", err);
  });

  return user;
}

export async function loginUser(email: string, password: string): Promise<User> {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  return user;
}

export async function confirmEmail(token: string): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.confirmToken, token));
  if (!user) return false;

  await db.update(users).set({ emailConfirmed: true, confirmToken: null }).where(eq(users.id, user.id));
  return true;
}

export async function getUserById(id: number): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  return user || null;
}

export async function updateUserStripeInfo(userId: number, data: {
  stripeCustomerId?: string;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  await db.update(users).set(data).where(eq(users.id, userId));
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export async function requireApiSubscription(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "API access requires an active subscription. Visit https://housing-intel.com/subscribe." });
  }
  const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
  if (!user || user.subscriptionStatus !== "active" || !["api", "both"].includes(user.subscriptionPlan || "")) {
    return res.status(403).json({ error: "API access requires an API or Both subscription plan. Visit https://housing-intel.com/subscribe." });
  }
  next();
}

export async function requireEmbedSubscription(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Embed access requires an active subscription. Visit https://housing-intel.com/subscribe." });
  }
  const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
  if (!user || user.subscriptionStatus !== "active" || !["embed", "both"].includes(user.subscriptionPlan || "")) {
    return res.status(403).json({ error: "Embed access requires an Embed or Both subscription plan. Visit https://housing-intel.com/subscribe." });
  }
  next();
}
