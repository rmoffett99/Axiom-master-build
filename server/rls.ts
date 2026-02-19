import { AsyncLocalStorage } from "async_hooks";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { pool, db } from "./db";
import * as schema from "@shared/schema";
import type { Request, Response, NextFunction } from "express";

type ScopedDb = NodePgDatabase<typeof schema>;

interface OrgContext {
  db: ScopedDb;
  orgId: string;
}

const orgContext = new AsyncLocalStorage<OrgContext>();

export function getDb(): ScopedDb {
  const store = orgContext.getStore();
  return (store?.db ?? db) as ScopedDb;
}

export function getCurrentOrgId(): string | null {
  return orgContext.getStore()?.orgId ?? null;
}

export async function withOrgContext<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query(`SELECT set_config('axiom.current_org', $1, false)`, [orgId]);
    const scopedDb = drizzle(client, { schema }) as ScopedDb;
    return await orgContext.run({ db: scopedDb, orgId }, fn);
  } finally {
    client.release();
  }
}

async function resolveOrgIdFromRequest(req: Request): Promise<string | null> {
  const orgId = req.query.orgId || req.headers["x-organization-id"];
  if (orgId && typeof orgId === "string") return orgId;

  const client = await pool.connect();
  try {
    const result = await client.query("SELECT id FROM organizations ORDER BY created_at LIMIT 1");
    return result.rows[0]?.id || null;
  } finally {
    client.release();
  }
}

export function rlsMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const exemptPaths = ["/organizations"];
    if (exemptPaths.some(p => req.path === p || req.path.startsWith(p + "/"))) {
      return next();
    }

    const orgId = await resolveOrgIdFromRequest(req);
    if (!orgId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    const client = await pool.connect();
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        client.release();
      }
    };

    try {
      await client.query(`SELECT set_config('axiom.current_org', $1, false)`, [orgId]);
      const scopedDb = drizzle(client, { schema }) as ScopedDb;

      res.on("finish", release);
      res.on("close", release);

      orgContext.run({ db: scopedDb, orgId }, () => {
        next();
      });
    } catch (err) {
      release();
      next(err);
    }
  };
}
