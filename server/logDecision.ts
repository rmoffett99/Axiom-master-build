import { db } from "./db";
import { decisionLog, decisionReasoning, decisionAudit } from "@shared/schema";

type LogDecisionInput = {
  orgId?: string | null;
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
      orgId = null,
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

    const [decision] = await db
      .insert(decisionLog)
      .values({
        orgId,
        decisionType,
        sourceModule,
        subjectType,
        subjectId,
        metadata,
      })
      .returning({ decisionId: decisionLog.decisionId });

    if (!decision?.decisionId) return null;

    if (summaryText && summaryText.trim().length > 0) {
      await db.insert(decisionReasoning).values({
        decisionId: decision.decisionId,
        summaryText,
        confidenceScore,
      });
    }

    await db.insert(decisionAudit).values({
      decisionId: decision.decisionId,
      eventType,
      actor,
      snapshot: auditSnapshot,
    });

    return decision.decisionId;
  } catch {
    return null;
  }
}
