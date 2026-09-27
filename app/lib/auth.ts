import { betterAuth } from "better-auth";
import { dash } from "@better-auth/infra";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/app/db";
import * as schema from "@/app/db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  plugins: [
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY,
    }),
  ],
  secret:
    process.env.BETTER_AUTH_SECRET ??
    (process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PHASE === "phase-production-build"
      ? "kloq-local-development-secret-change-in-production"
      : undefined),
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
});
