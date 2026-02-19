import { db } from "./db";
import {
  brainDecision,
  decisionInputSnapshot,
  decisionRuleHit,
  principlesApplied,
  overrideHistory,
  replayMismatchAlerts,
  rule,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import {
  computeAlignmentScore,
  computeDecisionHash,
  computeSnapshotHash,
} from "./brainIntegrity";

type ReplayResult = {
  decisionId: string;
  match: boolean;
  historicalOutcome: string;
  replayedOutcome: string;
  historicalAlignmentScore: number;
  replayedAlignmentScore: number;
  delta: number;
  severity: "LOW" | "MEDIUM" | "CRITICAL";
};

export async function replayDecision(decisionId: string): Promise<ReplayResult | null> {
  try {
    const [decision] = await db
      .select()
      .from(brainDecision)
      .where(eq(brainDecision.id, decisionId));

    if (!decision) return null;

    const snapshots = await db
      .select()
      .from(decisionInputSnapshot)
      .where(eq(decisionInputSnapshot.decisionId, decisionId));

    const snapshot = snapshots[0];
    if (!snapshot) return null;

    const ruleHits = await db
      .select({
        hitId: decisionRuleHit.hitId,
        ruleId: decisionRuleHit.ruleId,
        hit: decisionRuleHit.hit,
        outcome: decisionRuleHit.outcome,
        severity: decisionRuleHit.severity,
      })
      .from(decisionRuleHit)
      .where(eq(decisionRuleHit.decisionId, decisionId));

    const principles = await db
      .select()
      .from(principlesApplied)
      .where(eq(principlesApplied.decisionId, decisionId));

    const overrides = await db
      .select()
      .from(overrideHistory)
      .where(eq(overrideHistory.decisionId, decisionId));

    const replayedSnapshotHash = computeSnapshotHash(
      snapshot.inputJson as Record<string, unknown>
    );

    const principleRecords = principles.map((p) => ({
      principleId: p.principleId,
      applied: p.applied,
      priority: p.priority,
    }));

    const ruleHitRecords = ruleHits.map((h) => ({
      ruleId: h.ruleId,
      hit: h.hit,
      outcome: h.outcome ?? undefined,
    }));

    const replayedDecisionHash = computeDecisionHash({
      snapshotHash: replayedSnapshotHash,
      ruleHits: ruleHitRecords,
      principles: principleRecords,
      outcome: decision.outcome,
      timestamp: decision.hashTimestamp,
    });

    const avgPriority =
      principleRecords.length > 0
        ? principleRecords.reduce((s, p) => s + p.priority, 0) / principleRecords.length
        : 0;

    const hitCount = ruleHits.filter((h) => h.hit).length;

    const replayedAlignmentScore = computeAlignmentScore({
      ruleHitCount: hitCount,
      avgPrinciplePriority: avgPriority,
      hasOverrides: overrides.length > 0,
      validatedAssumptionCount: 0,
    });

    const replayedOutcome = decision.outcome;
    const historicalOutcome = decision.outcome;
    const historicalAlignmentScore = decision.alignmentScore;

    const scoreDelta = Math.abs(replayedAlignmentScore - historicalAlignmentScore);
    const outcomeMatch = replayedOutcome === historicalOutcome;
    const hashMatch = replayedDecisionHash === decision.decisionHash;

    let severity: "LOW" | "MEDIUM" | "CRITICAL";
    if (!outcomeMatch) {
      severity = "CRITICAL";
    } else if (scoreDelta > 5 || !hashMatch) {
      severity = "MEDIUM";
    } else {
      severity = "LOW";
    }

    const match = outcomeMatch && hashMatch && scoreDelta < 0.01;

    if (!match) {
      await db.insert(replayMismatchAlerts).values({
        decisionId,
        replayedOutcome,
        historicalOutcome,
        delta: scoreDelta,
        severity,
        replayedAt: new Date(),
      });
    }

    return {
      decisionId,
      match,
      historicalOutcome,
      replayedOutcome,
      historicalAlignmentScore,
      replayedAlignmentScore,
      delta: scoreDelta,
      severity,
    };
  } catch {
    return null;
  }
}
