import { getDb, getCurrentOrgId } from "./rls";
import {
  decisionLog,
  decisionReasoning,
  decisionAudit,
  brainDecision,
  decisionInputSnapshot,
  principlesApplied,
  principle,
  rule,
  decisionRuleHit,
} from "@shared/schema";
import { eq, and, type SQL } from "drizzle-orm";
import {
  computeSnapshotHash,
  computeDecisionHash,
  computeDecisionFingerprint,
  computeAlignmentScore,
  ALIGNMENT_SCORE_VERSION,
  ALIGNMENT_FORMULA_VERSION,
} from "./brainIntegrity";
import { proposeActionsForRuleHits } from "./actionProposals";

type LogDecisionInput = {
  organizationId?: string | null;
  decisionType: string;
  sourceModule: string;
  subjectType: string;
  subjectId: string;
  metadata?: Record<string, unknown>;
  summaryText?: string;
  confidenceScore?: number;
  eventType?: "created" | "evaluated" | "logged";
  actor?: string;
  auditSnapshot?: Record<string, unknown>;
};

export async function logDecision(input: LogDecisionInput): Promise<string | null> {
  try {
    const {
      organizationId,
      decisionType,
      sourceModule,
      subjectType,
      subjectId,
      metadata = {},
      summaryText,
      confidenceScore,
      eventType = "logged",
      actor = "system",
      auditSnapshot = {},
    } = input;

    const orgId = organizationId || getCurrentOrgId() || '';

    const [decision] = await getDb()
      .insert(decisionLog)
      .values({
        organizationId: orgId,
        decisionType,
        sourceModule,
        subjectType,
        subjectId,
        metadata,
      })
      .returning({ decisionId: decisionLog.decisionId });

    if (!decision?.decisionId) return null;

    if (summaryText && summaryText.trim().length > 0) {
      await getDb().insert(decisionReasoning).values({
        organizationId: orgId,
        decisionId: decision.decisionId,
        summaryText,
        confidenceScore,
      });
    }

    await getDb().insert(decisionAudit).values({
      organizationId: orgId,
      decisionId: decision.decisionId,
      eventType,
      actor,
      snapshot: auditSnapshot,
    });

    const domain = sourceModule || "general";
    const now = new Date();
    const timestamp = now.toISOString();

    const inputJson: Record<string, unknown> = {
      decisionType,
      sourceModule,
      subjectType,
      subjectId,
      metadata,
      summaryText: summaryText || null,
      auditSnapshot,
    };

    const snapshotHash = computeSnapshotHash(inputJson);

    let activePrinciples: { principleId: string; priority: number }[] = [];
    try {
      const pFilters: SQL[] = [eq(principle.isActive, true)];
      if (domain !== "general") pFilters.push(eq(principle.domain, domain));
      activePrinciples = await getDb()
        .select({ principleId: principle.principleId, priority: principle.priority })
        .from(principle)
        .where(and(...pFilters));
    } catch {
      activePrinciples = [];
    }

    const principleRecords = activePrinciples.map((p) => ({
      principleId: p.principleId,
      applied: true,
      priority: p.priority,
    }));

    let ruleHitRecords: { ruleId: string; hit: boolean; outcome?: string; severity?: string; ruleVersion: string }[] = [];
    const ruleHitInserts: { ruleId: string; ruleVersion: string; severity: string; hit: boolean; outcome: string; hitDetails: Record<string, unknown>; evaluatedAt: Date }[] = [];
    try {
      const rFilters: SQL[] = [eq(rule.domain, domain), eq(rule.isActive, true)];
      if (organizationId) rFilters.push(eq(rule.organizationId, organizationId));
      const activeRules = await getDb().select().from(rule).where(and(...rFilters));

      for (const r of activeRules) {
        let hit = false;
        let details: Record<string, unknown> = {};

        try {
          const fn = new Function("metadata", `return (${r.conditionExpr});`);
          hit = Boolean(fn(metadata));
          details = { evaluated: true };
        } catch {
          hit = false;
          details = { error: "evaluation_failed" };
        }

        ruleHitRecords.push({
          ruleId: r.ruleId,
          hit,
          outcome: r.outcome,
          severity: r.severity,
          ruleVersion: "v1.0",
        });

        ruleHitInserts.push({
          ruleId: r.ruleId,
          ruleVersion: "v1.0",
          severity: r.severity,
          hit,
          outcome: r.outcome,
          hitDetails: details,
          evaluatedAt: now,
        });
      }
    } catch {
      ruleHitRecords = [];
    }

    const outcome = decisionType;

    const decisionHashValue = computeDecisionHash({
      snapshotHash,
      ruleHits: ruleHitRecords.map((r) => ({ ruleId: r.ruleId, hit: r.hit, outcome: r.outcome })),
      principles: principleRecords,
      outcome,
      timestamp,
    });

    const fingerprint = computeDecisionFingerprint({
      inputSnapshot: inputJson,
      ruleHits: ruleHitRecords.map((r) => ({ ruleId: r.ruleId, hit: r.hit, outcome: r.outcome })),
      principles: principleRecords,
      outcome,
      modelVersion: "v1.0",
      timestamp,
    });

    const hitCount = ruleHitRecords.filter((r) => r.hit).length;
    const avgPriority =
      principleRecords.length > 0
        ? principleRecords.reduce((s, p) => s + p.priority, 0) / principleRecords.length
        : 0;

    const alignmentScore = computeAlignmentScore({
      ruleHitCount: hitCount,
      avgPrinciplePriority: avgPriority,
      hasOverrides: false,
      validatedAssumptionCount: 0,
    });

    const [brainRecord] = await getDb()
      .insert(brainDecision)
      .values({
        organizationId: orgId,
        domain,
        subjectType,
        subjectId,
        triggeredBy: actor,
        modelVersion: "v1.0",
        confidenceScore: confidenceScore ?? null,
        alignmentScore,
        alignmentScoreVersion: ALIGNMENT_SCORE_VERSION,
        alignmentFormulaVersion: ALIGNMENT_FORMULA_VERSION,
        alignmentScoreComputedAt: now,
        outcome,
        status: "recorded",
        snapshotHash,
        decisionHash: decisionHashValue,
        decisionFingerprint: fingerprint,
        hashTimestamp: timestamp,
        createdAt: now,
      })
      .returning({ id: brainDecision.id });

    if (brainRecord?.id) {
      await getDb().insert(decisionInputSnapshot).values({
        organizationId: orgId,
        decisionId: brainRecord.id,
        inputJson,
        hash: snapshotHash,
        createdAt: now,
      });

      if (ruleHitInserts.length > 0) {
        await getDb().insert(decisionRuleHit).values(
          ruleHitInserts.map((r) => ({
            organizationId: orgId,
            decisionId: brainRecord.id,
            ruleId: r.ruleId,
            ruleVersion: r.ruleVersion,
            severity: r.severity,
            hit: r.hit,
            outcome: r.outcome,
            hitDetails: r.hitDetails,
            evaluatedAt: r.evaluatedAt,
          }))
        );
      }

      if (principleRecords.length > 0) {
        await getDb().insert(principlesApplied).values(
          principleRecords.map((p) => ({
            organizationId: orgId,
            decisionId: brainRecord.id,
            principleId: p.principleId,
            principleVersion: "v1.0",
            priority: p.priority,
            applied: p.applied,
            createdAt: now,
          }))
        );
      }
    }

    if (ruleHitRecords.some((r) => r.hit) && brainRecord?.id) {
      proposeActionsForRuleHits({
        decisionId: brainRecord.id,
        organizationId,
        domain,
        metadata,
      }).catch(() => {});
    }

    return decision.decisionId;
  } catch {
    return null;
  }
}
