import { db } from "./db";
import { rule, decisionRuleHit } from "@shared/schema";
import { eq, and, type SQL } from "drizzle-orm";

type RunRulesInput = {
  decisionId: string;
  orgId?: string | null;
  domain: string;
  metadata: Record<string, unknown>;
};

export async function runRules(input: RunRulesInput): Promise<void> {
  try {
    const { decisionId, orgId = null, domain, metadata } = input;

    const filters: SQL[] = [eq(rule.domain, domain), eq(rule.isActive, true)];
    if (orgId) filters.push(eq(rule.orgId, orgId));

    const activeRules = await db
      .select()
      .from(rule)
      .where(and(...filters));

    for (const r of activeRules) {
      let hit = false;
      let details: Record<string, unknown> = {};

      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function("metadata", `return (${r.conditionExpr});`);
        hit = Boolean(fn(metadata));
        details = { evaluated: true };
      } catch {
        hit = false;
        details = { error: "evaluation_failed" };
      }

      await db.insert(decisionRuleHit).values({
        decisionId,
        ruleId: r.ruleId,
        hit,
        hitDetails: details,
      });
    }
  } catch {
    // fail silently
  }
}
