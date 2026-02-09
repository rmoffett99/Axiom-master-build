import { db } from "./db";
import {
  brainDecisionLog,
  brainReasoningSummary,
  brainAuditTrail,
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
      await db.insert(brainDecisionLog).values({
        axiomDecisionId: params.decisionId,
        eventType: "decision_created",
        actorId: params.actorId,
        actorName: params.actorName,
        title: params.title,
        summary: `Decision created: "${params.title}" with ${params.assumptions.length} assumptions`,
        snapshot: {
          context: params.context,
          rationale: params.rationale,
          assumptionCount: params.assumptions.length,
          assumptions: params.assumptions.map((a) => a.description),
        },
      });

      await db.insert(brainReasoningSummary).values({
        axiomDecisionId: params.decisionId,
        axiomEntityType: "decision",
        axiomEntityId: params.decisionId,
        action: "create",
        reasoning: params.rationale,
        inputData: {
          context: params.context,
          assumptions: params.assumptions.map((a) => a.description),
        },
        outcomeData: { title: params.title, status: "published" },
      });

      await db.insert(brainAuditTrail).values({
        actorId: params.actorId,
        actorName: params.actorName,
        action: "decision_created",
        entityType: "decision",
        entityId: params.decisionId,
        after: {
          title: params.title,
          assumptionCount: params.assumptions.length,
        },
        meta: { source: "axiom_app" },
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
      await db.insert(brainDecisionLog).values({
        axiomDecisionId: params.decisionId,
        eventType: "decision_amended",
        actorId: params.authorId,
        actorName: params.authorName,
        title: params.title,
        summary: `Decision amended to version ${params.versionNumber}`,
        snapshot: {
          versionNumber: params.versionNumber,
          rationale: params.rationale,
          context: params.context,
        },
      });

      await db.insert(brainReasoningSummary).values({
        axiomDecisionId: params.decisionId,
        axiomEntityType: "decision_version",
        axiomEntityId: params.decisionId,
        action: "amend",
        reasoning: params.rationale,
        inputData: { context: params.context },
        outcomeData: {
          versionNumber: params.versionNumber,
          title: params.title,
        },
      });

      await db.insert(brainAuditTrail).values({
        actorId: params.authorId,
        actorName: params.authorName,
        action: "decision_amended",
        entityType: "decision",
        entityId: params.decisionId,
        after: { versionNumber: params.versionNumber },
        meta: { source: "axiom_app" },
      });
    });
  },

  logAssumptionStatusChanged(params: {
    assumptionId: string;
    decisionId: string;
    validatorId: string;
    validatorName?: string;
    description: string;
    previousStatus: string;
    newStatus: string;
  }) {
    safeRecord(async () => {
      await db.insert(brainDecisionLog).values({
        axiomDecisionId: params.decisionId,
        eventType: "assumption_status_changed",
        actorId: params.validatorId,
        actorName: params.validatorName,
        title: `Assumption ${params.newStatus}`,
        summary: `Assumption "${params.description.substring(0, 100)}" changed from ${params.previousStatus} to ${params.newStatus}`,
        snapshot: {
          assumptionId: params.assumptionId,
          previousStatus: params.previousStatus,
          newStatus: params.newStatus,
        },
      });

      await db.insert(brainAuditTrail).values({
        actorId: params.validatorId,
        actorName: params.validatorName,
        action: "assumption_status_changed",
        entityType: "assumption",
        entityId: params.assumptionId,
        before: { status: params.previousStatus },
        after: { status: params.newStatus },
        meta: { decisionId: params.decisionId, source: "axiom_app" },
      });
    });
  },

  logAlertAcknowledged(params: {
    alertId: string;
    decisionId: string;
    userId: string;
    userName?: string;
    alertMessage: string;
    alertType: string;
    alertSeverity: string;
  }) {
    safeRecord(async () => {
      await db.insert(brainDecisionLog).values({
        axiomDecisionId: params.decisionId,
        eventType: "alert_acknowledged",
        actorId: params.userId,
        actorName: params.userName,
        title: `Alert acknowledged: ${params.alertType}`,
        summary: `${params.alertSeverity} alert acknowledged: "${params.alertMessage.substring(0, 100)}"`,
        snapshot: {
          alertId: params.alertId,
          alertType: params.alertType,
          severity: params.alertSeverity,
        },
      });

      await db.insert(brainAuditTrail).values({
        actorId: params.userId,
        actorName: params.userName,
        action: "alert_acknowledged",
        entityType: "alert",
        entityId: params.alertId,
        before: { acknowledgedAt: null },
        after: { acknowledgedAt: new Date().toISOString() },
        meta: { decisionId: params.decisionId, source: "axiom_app" },
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
      await db.insert(brainDecisionLog).values({
        axiomDecisionId: params.decisionId,
        eventType: "alert_created",
        title: `Alert generated: ${params.alertType}`,
        summary: `${params.severity} alert: "${params.message.substring(0, 100)}"`,
        snapshot: {
          alertId: params.alertId,
          alertType: params.alertType,
          severity: params.severity,
        },
      });

      await db.insert(brainAuditTrail).values({
        action: "alert_created",
        entityType: "alert",
        entityId: params.alertId,
        after: {
          decisionId: params.decisionId,
          type: params.alertType,
          severity: params.severity,
          message: params.message,
        },
        meta: { source: "axiom_system" },
      });
    });
  },
};
