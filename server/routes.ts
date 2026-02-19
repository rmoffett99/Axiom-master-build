import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { logDecision } from "./logDecision";
import { runRules } from "./runRules";
import { approveActionProposal, executeApprovedAction } from "./actionProposals";
import { db } from "./db";
import { actionProposal, automationSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

// Validation schemas for API requests
const createDecisionSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  context: z.string().min(20, "Context must be at least 20 characters"),
  rationale: z.string().min(20, "Rationale must be at least 20 characters"),
  outcome: z.string().min(10, "Outcome must be at least 10 characters"),
  alternatives: z.string().optional(),
  risks: z.string().optional(),
  ownerId: z.string().min(1, "Owner is required"),
  teamId: z.string().optional(),
  reviewByDate: z.string().optional(),
  assumptions: z.array(z.object({
    description: z.string().min(5, "Assumption must be at least 5 characters"),
    validUntil: z.string().optional(),
  })).min(3, "At least 3 assumptions are required"),
});

const amendDecisionSchema = z.object({
  title: z.string().min(5).optional(),
  context: z.string().min(20),
  rationale: z.string().min(20),
  outcome: z.string().min(10),
  alternatives: z.string().optional(),
  risks: z.string().optional(),
  authorId: z.string().min(1),
});

const updateAssumptionSchema = z.object({
  status: z.enum(["valid", "expired", "invalidated", "pending_review"]),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Teams
  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  // Dashboard
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Decisions
  app.get("/api/decisions", async (req, res) => {
    try {
      const decisions = await storage.getAllDecisions();
      res.json(decisions);
    } catch (error) {
      console.error("Error fetching decisions:", error);
      res.status(500).json({ error: "Failed to fetch decisions" });
    }
  });

  app.get("/api/decisions/:id", async (req, res) => {
    try {
      const decision = await storage.getDecision(req.params.id);
      if (!decision) {
        return res.status(404).json({ error: "Decision not found" });
      }
      res.json(decision);
    } catch (error) {
      console.error("Error fetching decision:", error);
      res.status(500).json({ error: "Failed to fetch decision" });
    }
  });

  app.post("/api/decisions", async (req, res) => {
    try {
      // Validate request body with Zod schema
      const parseResult = createDecisionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: parseResult.error.errors 
        });
      }

      const { title, context, rationale, outcome, alternatives, risks, ownerId, teamId, reviewByDate, assumptions } = parseResult.data;

      const validAssumptions = assumptions.filter(a => a.description.length >= 5);
      if (validAssumptions.length < 3) {
        return res.status(400).json({ error: "At least 3 valid assumptions are required" });
      }

      const decision = await storage.createDecision(
        {
          title,
          ownerId,
          teamId: teamId || null,
          status: "draft",
          reviewByDate: reviewByDate ? new Date(reviewByDate) : null,
        },
        {
          title,
          context,
          rationale,
          outcome,
          alternatives: alternatives || null,
          risks: risks || null,
          authorId: ownerId,
        },
        validAssumptions.map((a: { description: string; validUntil?: string }) => ({
          description: a.description,
          status: "valid" as const,
          validUntil: a.validUntil ? new Date(a.validUntil) : null,
        }))
      );

      // Calculate initial debt score
      await storage.updateDecisionDebtScore(decision.id, calculateDebtScore(validAssumptions.length, 0));

      logDecision({
        decisionType: "create_decision",
        sourceModule: "decisions",
        subjectType: "decision",
        subjectId: decision.id,
        metadata: { title, assumptionCount: validAssumptions.length },
        summaryText: `Decision created: "${title}" with ${validAssumptions.length} assumptions. ${rationale.substring(0, 300)}`,
        eventType: "created",
        actor: ownerId,
        auditSnapshot: { title, context, rationale, assumptionCount: validAssumptions.length },
      }).then((decisionId) => {
        if (decisionId) runRules({ decisionId, domain: "decisions", metadata: { title, assumptionCount: validAssumptions.length } });
      });

      res.json(decision);
    } catch (error) {
      console.error("Error creating decision:", error);
      res.status(500).json({ error: "Failed to create decision" });
    }
  });

  app.post("/api/decisions/:id/amend", async (req, res) => {
    try {
      // Validate request body with Zod schema
      const parseResult = amendDecisionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: parseResult.error.errors 
        });
      }

      const { title, context, rationale, outcome, alternatives, risks, authorId } = parseResult.data;

      const decision = await storage.getDecision(req.params.id);
      if (!decision) {
        return res.status(404).json({ error: "Decision not found" });
      }

      // Append-only: Create new version instead of modifying existing
      const version = await storage.amendDecision(req.params.id, {
        title: title || decision.title,
        context,
        rationale,
        outcome,
        alternatives: alternatives || null,
        risks: risks || null,
        authorId,
      });

      logDecision({
        decisionType: "amend_decision",
        sourceModule: "decisions",
        subjectType: "decision",
        subjectId: req.params.id,
        metadata: { versionNumber: version.versionNumber, title: title || decision.title },
        summaryText: `Decision amended to version ${version.versionNumber}: "${title || decision.title}". ${rationale.substring(0, 300)}`,
        eventType: "evaluated",
        actor: authorId,
        auditSnapshot: { versionNumber: version.versionNumber, rationale, context },
      }).then((decisionId) => {
        if (decisionId) runRules({ decisionId, domain: "decisions", metadata: { versionNumber: version.versionNumber, title: title || decision.title } });
      });

      res.json(version);
    } catch (error) {
      console.error("Error amending decision:", error);
      res.status(500).json({ error: "Failed to amend decision" });
    }
  });

  // Assumptions
  app.patch("/api/assumptions/:id", async (req, res) => {
    try {
      // Validate request body with Zod schema
      const parseResult = updateAssumptionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: parseResult.error.errors 
        });
      }

      const { status } = parseResult.data;
      
      // Use first user as the validator (in production, get from session)
      const users = await storage.getAllUsers();
      const validatorId = users[0]?.id;

      if (!validatorId) {
        return res.status(400).json({ error: "No user available" });
      }

      const assumption = await storage.updateAssumptionStatus(req.params.id, status, validatorId);

      // If assumption was invalidated, create an alert
      if (status === "invalidated") {
        const existingAssumption = await storage.getAssumption(req.params.id);
        if (existingAssumption) {
          const newAlert = await storage.createAlert({
            decisionId: existingAssumption.decisionId,
            type: "assumption_expired",
            severity: "high",
            message: `Assumption invalidated: ${existingAssumption.description.substring(0, 100)}`,
            metadata: { assumptionId: existingAssumption.id },
          });

          logDecision({
            decisionType: "create_alert",
            sourceModule: "alerts",
            subjectType: "alert",
            subjectId: newAlert.id,
            metadata: { axiomDecisionId: existingAssumption.decisionId, alertType: "assumption_expired", severity: "high" },
            summaryText: newAlert.message,
            eventType: "created",
            actor: validatorId,
            auditSnapshot: { alertType: "assumption_expired", severity: "high", message: newAlert.message },
          }).then((decisionId) => {
            if (decisionId) runRules({ decisionId, domain: "alerts", metadata: { alertType: "assumption_expired", severity: "high" } });
          });
        }
      }

      const updatedAssumption = await storage.getAssumption(req.params.id);
      if (updatedAssumption) {
        logDecision({
          decisionType: "assumption_change",
          sourceModule: "assumptions",
          subjectType: "assumption",
          subjectId: req.params.id,
          metadata: { axiomDecisionId: updatedAssumption.decisionId, newStatus: status },
          summaryText: `Assumption "${updatedAssumption.description.substring(0, 200)}" changed to ${status}`,
          eventType: "logged",
          actor: validatorId,
          auditSnapshot: { newStatus: status, description: updatedAssumption.description },
        }).then((decisionId) => {
          if (decisionId) runRules({ decisionId, domain: "assumptions", metadata: { newStatus: status } });
        });
      }

      res.json(assumption);
    } catch (error) {
      console.error("Error updating assumption:", error);
      res.status(500).json({ error: "Failed to update assumption" });
    }
  });

  // Alerts
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAllAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts/:id/acknowledge", async (req, res) => {
    try {
      // Use first user as acknowledger (in production, get from session)
      const users = await storage.getAllUsers();
      const userId = users[0]?.id;

      if (!userId) {
        return res.status(400).json({ error: "No user available" });
      }

      const alert = await storage.acknowledgeAlert(req.params.id, userId);

      logDecision({
        decisionType: "acknowledge_alert",
        sourceModule: "alerts",
        subjectType: "alert",
        subjectId: req.params.id,
        metadata: { axiomDecisionId: alert.decisionId, alertType: alert.type, severity: alert.severity },
        summaryText: `Alert acknowledged: ${alert.message.substring(0, 300)}`,
        eventType: "logged",
        actor: userId,
        auditSnapshot: { alertType: alert.type, severity: alert.severity, message: alert.message },
      }).then((decisionId) => {
        if (decisionId) runRules({ decisionId, domain: "alerts", metadata: { alertType: alert.type, severity: alert.severity } });
      });

      res.json(alert);
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  });

  // ===== Company Brain V3: Action Proposals & Approvals =====
  // Backend-only endpoints. No UI. Full audit trail.

  app.get("/api/brain/proposals", async (req, res) => {
    try {
      const statusParam = z.enum(["pending", "approved", "rejected", "executed", "expired"]).optional().safeParse(req.query.status);
      const status = statusParam.success ? statusParam.data : undefined;
      const filters = status ? eq(actionProposal.status, status) : undefined;
      const proposals = await db.select().from(actionProposal).where(filters).orderBy(actionProposal.createdAt);
      res.json(proposals);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      res.status(500).json({ error: "Failed to fetch proposals" });
    }
  });

  app.post("/api/brain/proposals/:id/approve", async (req, res) => {
    try {
      const parseResult = z.object({
        approverId: z.string().min(1),
        approverRole: z.string().min(1),
        status: z.enum(["approved", "rejected"]),
        reason: z.string().optional(),
      }).safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }

      const result = await approveActionProposal({
        proposalId: req.params.id,
        ...parseResult.data,
      });

      if (!result) {
        return res.status(404).json({ error: "Proposal not found or not pending" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error approving proposal:", error);
      res.status(500).json({ error: "Failed to approve proposal" });
    }
  });

  app.post("/api/brain/proposals/:id/execute", async (req, res) => {
    try {
      const parseResult = z.object({
        executedBy: z.string().min(1),
      }).safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }

      const result = await executeApprovedAction({
        proposalId: req.params.id,
        executedBy: parseResult.data.executedBy,
      });

      if (!result) {
        return res.status(404).json({ error: "Proposal not found or not approved" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error executing proposal:", error);
      res.status(500).json({ error: "Failed to execute proposal" });
    }
  });

  app.get("/api/brain/automation", async (req, res) => {
    try {
      const settings = await db.select().from(automationSettings).limit(1);
      if (settings.length === 0) {
        return res.json({ enabled: false, disabledReason: "not_configured" });
      }
      res.json(settings[0]);
    } catch (error) {
      console.error("Error fetching automation settings:", error);
      res.status(500).json({ error: "Failed to fetch automation settings" });
    }
  });

  app.patch("/api/brain/automation", async (req, res) => {
    try {
      const parseResult = z.object({
        enabled: z.boolean(),
        disabledReason: z.string().optional(),
        updatedBy: z.string().min(1),
      }).safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }

      const { enabled, disabledReason, updatedBy } = parseResult.data;

      const existing = await db.select().from(automationSettings).limit(1);
      if (existing.length === 0) {
        const [created] = await db.insert(automationSettings).values({
          enabled,
          disabledReason: disabledReason || null,
          updatedBy,
        }).returning();
        return res.json(created);
      }

      const [updated] = await db
        .update(automationSettings)
        .set({ enabled, disabledReason: disabledReason || null, updatedBy, updatedAt: new Date() })
        .where(eq(automationSettings.settingsId, existing[0].settingsId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error updating automation settings:", error);
      res.status(500).json({ error: "Failed to update automation settings" });
    }
  });

  return httpServer;
}

function calculateDebtScore(assumptionCount: number, alertCount: number): number {
  let score = 20;
  
  if (assumptionCount < 5) {
    score += (5 - assumptionCount) * 5;
  }
  
  score += alertCount * 10;
  
  return Math.min(100, Math.max(0, score));
}
