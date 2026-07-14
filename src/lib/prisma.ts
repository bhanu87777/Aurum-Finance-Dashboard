import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Reuse a single PrismaClient across hot-reloads / warm serverless invocations
// to avoid exhausting the connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const logLevels = (
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
) as ("error" | "warn")[];

function createPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "";

  // On Neon (serverless Postgres) connect through Neon's serverless driver over
  // WebSocket. Serverless platforms like Vercel have no IPv6 egress, so a raw
  // TCP connection to Neon's dual-stack host fails instantly ("Can't reach
  // database server"). The WebSocket driver sidesteps that entirely.
  if (url.includes("neon.tech")) {
    neonConfig.webSocketConstructor = ws;
    const clean = new URL(url);
    clean.searchParams.delete("channel_binding"); // engine can't negotiate it
    const adapter = new PrismaNeon({ connectionString: clean.toString() });
    return new PrismaClient({ adapter, log: logLevels });
  }

  // Local / non-Neon Postgres: standard TCP connection.
  return new PrismaClient({ log: logLevels });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
