import { getDb, getCurrentOrgId } from "./rls";
import {
  rule,
  decisionRuleHit,
  actionProposal,
  actionApproval,
  actionExecution,
  automationSettings,
} from "@shared/schema";
import { eq, and, type SQL } from "drizzle-orm";

type ProposeInput = {
  decisionId: string;
  organizationId?: string | null;
  domain: string;
  metadata: Record<string, unknown>;
};

export async function proposeActionsForRuleHits(input: ProposeInput): Promise<void> {
  try {
    const { decisionId, organizationId = null, domain } = input;

    const hits = await getDb()
      .select({
        hitId: decisionRuleHit.hitId,
        ruleId: decisionRuleHit.ruleId,
        hit: decisionRuleHit.hit,
        ruleName: rule.name,
        outcome: rule.outcome,
        severity: rule.severity,
        ruleParams: rule.params,
      })
      .from(decisionRuleHit)
      .innerJoin(rule, eq(decisionRuleHit.ruleId, rule.ruleId))
      .where(
        and(
          eq(decisionRuleHit.decisionId, decisionId),
          eq(decisionRuleHit.hit, true)
        )
      );

    for (const h of hits) {
      if (h.outcome !== "require_review" && h.outcome !== "block") continue;

      const params = (h.ruleParams ?? {}) as Record<string, unknown>;

      await getDb().insert(actionProposal).values({
        organizationId: organizationId || getCurrentOrgId() || '',
        decisionId,
        ruleId: h.ruleId,
        actionId: (params.actionId as string) || null,
        ruleOutcome: h.outcome,
        status: "pending",
        metadata: {
          domain,
          ruleName: h.ruleName,
          severity: h.severity,
          organizationId,
        },
        requestedByActor: "system",
      });
    }
  } catch {
    // fail silently
  }
}

type ApproveInput = {
  proposalId: string;
  approverId: string;
  approverRole: string;
  status: "approved" | "rejected";
  reason?: string;
};

export async function approveActionProposal(input: ApproveInput): Promise<{ proposalId: string; status: string } | null> {
  try {
    const { proposalId, approverId, approverRole, status, reason } = input;

    const [proposal] = await getDb()
      .select()
      .from(actionProposal)
      .where(eq(actionProposal.proposalId, proposalId));

    if (!proposal) return null;
    if (proposal.status !== "pending") return null;

    await getDb().insert(actionApproval).values({
      organizationId: proposal.organizationId || getCurrentOrgId()!,
      proposalId,
      approverId,
      approverRole,
      status,
      reason: reason || null,
    });

    await getDb()
      .update(actionProposal)
      .set({ status })
      .where(eq(actionProposal.proposalId, proposalId));

    return { proposalId, status };
  } catch {
    return null;
  }
}

type ExecuteInput = {
  proposalId: string;
  executedBy: string;
};

export async function executeApprovedAction(input: ExecuteInput): Promise<{ executionId: string; status: string } | null> {
  try {
    const { proposalId, executedBy } = input;

    const settings = await getDb().select().from(automationSettings).limit(1);
    const globalEnabled = settings.length > 0 ? settings[0].enabled : false;
    if (!globalEnabled) {
      await getDb().insert(actionExecution).values({
        organizationId: getCurrentOrgId()!,
        proposalId,
        executedBy,
        status: "skipped",
        result: { reason: "automation_disabled" },
      });

      await getDb()
        .update(actionProposal)
        .set({ status: "expired" })
        .where(eq(actionProposal.proposalId, proposalId));

      return { executionId: "", status: "skipped" };
    }

    const [proposal] = await getDb()
      .select()
      .from(actionProposal)
      .where(eq(actionProposal.proposalId, proposalId));

    if (!proposal) return null;
    if (proposal.status !== "approved") return null;

    const [execution] = await getDb()
      .insert(actionExecution)
      .values({
        organizationId: proposal.organizationId || getCurrentOrgId()!,
        proposalId,
        executedBy,
        status: "success",
        result: { executed: true, actionId: proposal.actionId },
      })
      .returning({ executionId: actionExecution.executionId });

    await getDb()
      .update(actionProposal)
      .set({ status: "executed" })
      .where(eq(actionProposal.proposalId, proposalId));

    return { executionId: execution.executionId, status: "success" };
  } catch {
    return null;
  }
}
