import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString)
  throw new Error("DATABASE_URL is required to use the database");
export const db = drizzle({
  connection: { url: connectionString, max: 5, prepare: false },
});
