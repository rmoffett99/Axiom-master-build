import { getDb, getCurrentOrgId } from "./rls";
import { rule, decisionRuleHit } from "@shared/schema";
import { eq, and, type SQL } from "drizzle-orm";
import { proposeActionsForRuleHits } from "./actionProposals";

type RunRulesInput = {
  decisionId: string;
  organizationId?: string | null;
  domain: string;
  metadata: Record<string, unknown>;
};

export async function runRules(input: RunRulesInput): Promise<void> {
  try {
    const { decisionId, organizationId = null, domain, metadata } = input;

    const filters: SQL[] = [eq(rule.domain, domain), eq(rule.isActive, true)];
    if (organizationId) filters.push(eq(rule.organizationId, organizationId));

    const activeRules = await getDb()
      .select()
      .from(rule)
      .where(and(...filters));

    for (const r of activeRules) {
      let hit = false;
      let details: Record<string, unknown> = {};
      const now = new Date();

      try {
        const fn = new Function("metadata", `return (${r.conditionExpr});`);
        hit = Boolean(fn(metadata));
        details = { evaluated: true };
      } catch {
        hit = false;
        details = { error: "evaluation_failed" };
      }

      await getDb().insert(decisionRuleHit).values({
        organizationId: organizationId || getCurrentOrgId() || '',
        decisionId,
        ruleId: r.ruleId,
        ruleVersion: "v1.0",
        severity: r.severity,
        hit,
        outcome: r.outcome,
        hitDetails: details,
        evaluatedAt: now,
      });
    }

    proposeActionsForRuleHits({ decisionId, organizationId, domain, metadata }).catch(() => {});
  } catch {
    // fail silently
  }
}
