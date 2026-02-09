import { db } from "./db";
import {
  decisionLog,
  decisionReasoning,
  decisionAudit,
} from "@shared/schema";

function safeRecord(fn: () => Promise<void>) {
  fn().catch((err) => {
    console.error("[brain-recorder] passive write failed:", err.message);
  });
}

export const brainRecorder = {
  logDecisionCreated(params: {
    decisionId: string;
    actorId: string;
    actorName?: string;
    title: string;
    context: string;
    rationale: string;
    assumptions: { description: string }[];
  }) {
    safeRecord(async () => {
      const [row] = await db.insert(decisionLog).values({
        decisionType: "create_decision",
        sourceModule: "decisions",
        subjectType: "decision",
        subjectId: params.decisionId,
        metadata: {
          axiomDecisionId: params.decisionId,
          actorId: params.actorId,
          actorName: params.actorName,
          title: params.title,
          assumptionCount: params.assumptions.length,
          assumptions: params.assumptions.map((a) => a.description),
        },
      }).returning({ decisionId: decisionLog.decisionId });

      await db.insert(decisionReasoning).values({
        decisionId: row.decisionId,
        summaryText: `Decision created: "${params.title}" with ${params.assumptions.length} assumptions. Rationale: ${params.rationale.substring(0, 500)}`,
        confidenceScore: null,
      });

      await db.insert(decisionAudit).values({
        decisionId: row.decisionId,
        eventType: "created",
        actor: params.actorId,
        snapshot: {
          title: params.title,
          context: params.context,
          rationale: params.rationale,
          assumptionCount: params.assumptions.length,
        },
      });
    });
  },

  logDecisionAmended(params: {
    decisionId: string;
    authorId: string;
    authorName?: string;
    title: string;
    versionNumber: number;
    rationale: string;
    context: string;
  }) {
    safeRecord(async () => {
      const [row] = await db.insert(decisionLog).values({
        decisionType: "amend_decision",
        sourceModule: "decisions",
        subjectType: "decision",
        subjectId: params.decisionId,
        metadata: {
          axiomDecisionId: params.decisionId,
          authorId: params.authorId,
          authorName: params.authorName,
          title: params.title,
          versionNumber: params.versionNumber,
        },
      }).returning({ decisionId: decisionLog.decisionId });

      await db.insert(decisionReasoning).values({
        decisionId: row.decisionId,
        summaryText: `Decision amended to version ${params.versionNumber}: "${params.title}". Rationale: ${params.rationale.substring(0, 500)}`,
        confidenceScore: null,
      });

      await db.insert(decisionAudit).values({
        decisionId: row.decisionId,
        eventType: "evaluated",
        actor: params.authorId,
        snapshot: {
          versionNumber: params.versionNumber,
          rationale: params.rationale,
          context: params.context,
        },
      });
    });
  },

  logAssumptionStatusChanged(params: {
    assumptionId: string;
    decisionId: string;
    validatorId: string;
    description: string;
    previousStatus: string;
    newStatus: string;
  }) {
    safeRecord(async () => {
      const [row] = await db.insert(decisionLog).values({
        decisionType: "assumption_change",
        sourceModule: "assumptions",
        subjectType: "assumption",
        subjectId: params.assumptionId,
        metadata: {
          axiomDecisionId: params.decisionId,
          assumptionId: params.assumptionId,
          validatorId: params.validatorId,
          previousStatus: params.previousStatus,
          newStatus: params.newStatus,
          description: params.description.substring(0, 500),
        },
      }).returning({ decisionId: decisionLog.decisionId });

      await db.insert(decisionAudit).values({
        decisionId: row.decisionId,
        eventType: "logged",
        actor: params.validatorId,
        snapshot: {
          previousStatus: params.previousStatus,
          newStatus: params.newStatus,
          description: params.description,
        },
      });
    });
  },

  logAlertAcknowledged(params: {
    alertId: string;
    decisionId: string;
    userId: string;
    alertMessage: string;
    alertType: string;
    alertSeverity: string;
  }) {
    safeRecord(async () => {
      const [row] = await db.insert(decisionLog).values({
        decisionType: "acknowledge_alert",
        sourceModule: "alerts",
        subjectType: "alert",
        subjectId: params.alertId,
        metadata: {
          axiomDecisionId: params.decisionId,
          alertId: params.alertId,
          userId: params.userId,
          alertType: params.alertType,
          severity: params.alertSeverity,
          message: params.alertMessage.substring(0, 500),
        },
      }).returning({ decisionId: decisionLog.decisionId });

      await db.insert(decisionAudit).values({
        decisionId: row.decisionId,
        eventType: "logged",
        actor: params.userId,
        snapshot: {
          alertType: params.alertType,
          severity: params.alertSeverity,
          message: params.alertMessage,
        },
      });
    });
  },

  logAlertCreated(params: {
    alertId: string;
    decisionId: string;
    alertType: string;
    severity: string;
    message: string;
  }) {
    safeRecord(async () => {
      const [row] = await db.insert(decisionLog).values({
        decisionType: "create_alert",
        sourceModule: "alerts",
        subjectType: "alert",
        subjectId: params.alertId,
        metadata: {
          axiomDecisionId: params.decisionId,
          alertId: params.alertId,
          alertType: params.alertType,
          severity: params.severity,
          message: params.message.substring(0, 500),
        },
      }).returning({ decisionId: decisionLog.decisionId });

      await db.insert(decisionAudit).values({
        decisionId: row.decisionId,
        eventType: "created",
        actor: "system",
        snapshot: {
          alertType: params.alertType,
          severity: params.severity,
          message: params.message,
        },
      });
    });
  },
};
