import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { logDecision } from "./logDecision";
import { approveActionProposal, executeApprovedAction } from "./actionProposals";
import { replayDecision } from "./replayEngine";
import { computeBundleHash } from "./brainIntegrity";
import { getDb, rlsMiddleware } from "./rls";
import {
  actionProposal,
  automationSettings,
  brainDecision,
  decisionInputSnapshot,
  decisionRuleHit,
  principlesApplied,
  overrideHistory,
  assumptionValidationHistory,
  auditAccessLog,
  auditExportLog,
  demoRequests,
} from "@shared/schema";
import { eq, desc, and, gte, lte, ilike, sql, type SQL } from "drizzle-orm";
import {
  decisionLog,
  decisionAudit,
  decisionReasoning,
} from "@shared/schema";

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

const demoRequestSchema = z.object({
  companyName: z.string().min(2).max(120),
  workEmail: z.string().min(3).max(254).email(),
  fullName: z.string().max(120).optional(),
  role: z.string().max(120).optional(),
  notes: z.string().max(1000).optional(),
  website: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  company: z.string().optional(),
  message: z.string().optional(),
});

async function handleDemoRequest(req: any, res: any) {
  const requestId = crypto.randomUUID();
  try {
    const raw = req.body || {};
    const resolvedBody = {
      companyName: (raw.companyName || raw.company || "").trim(),
      workEmail: (raw.workEmail || raw.email || "").trim(),
      fullName: (raw.fullName || raw.name || "").trim() || undefined,
      role: (raw.role || "").trim() || undefined,
      notes: (raw.notes || raw.message || "").trim() || undefined,
      website: raw.website,
    };

    if (typeof resolvedBody.website === "string" && resolvedBody.website.trim().length > 0) {
      return res.json({ ok: true, status: "queued", requestId });
    }
    delete resolvedBody.website;

    const parsed = demoRequestSchema.pick({
      companyName: true,
      workEmail: true,
      fullName: true,
      role: true,
      notes: true,
    }).safeParse(resolvedBody);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "invalid_request" });
    }

    const { companyName, workEmail, fullName, role, notes } = parsed.data;
    const idempotencyKey = `${workEmail.toLowerCase()}|${companyName.toLowerCase()}`;

    const db = getDb();
    const existing = await db.select({ id: demoRequests.id, status: demoRequests.status })
      .from(demoRequests)
      .where(eq(demoRequests.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existing.length > 0) {
      console.log(`DEMO_REQUEST requestId=${requestId} status=already_exists idempotencyKey=${idempotencyKey}`);
      return res.json({
        ok: true,
        status: "already_exists",
        requestId: existing[0].id,
      });
    }

    const [inserted] = await db.insert(demoRequests).values({
      idempotencyKey,
      companyName,
      workEmail,
      fullName: fullName || null,
      role: role || null,
      notes: notes || null,
      status: "queued",
    }).returning({ id: demoRequests.id });

    const savedId = inserted.id;
    console.log(`DEMO_REQUEST requestId=${savedId} status=queued email=${workEmail} company=${companyName}`);

    res.json({
      ok: true,
      status: "queued",
      requestId: savedId,
      message: "Demo request received. We'll reach out shortly.",
    });

    setImmediate(async () => {
      try {
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey) {
          const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
          const ts = new Date().toISOString();
          const emailBody = [
            `<h2>New AXIOM Demo Request</h2>`,
            `<p><strong>Company:</strong> ${esc(companyName)}</p>`,
            `<p><strong>Email:</strong> ${esc(workEmail)}</p>`,
            `<p><strong>Name:</strong> ${esc(fullName || "Not provided")}</p>`,
            `<p><strong>Role:</strong> ${esc(role || "Not provided")}</p>`,
            `<p><strong>Notes:</strong> ${esc(notes ? notes.substring(0, 200) : "None")}</p>`,
            `<hr/>`,
            `<p style="color:#888;font-size:12px;">Request ID: ${savedId} | ${ts}</p>`,
          ].join("\n");

          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "AXIOM Demo <onboarding@resend.dev>",
              to: "hello@axiomdecisionlayer.com",
              reply_to: workEmail,
              subject: `New Demo Request — ${companyName}`,
              html: emailBody,
            }),
          });

          if (!resendRes.ok) {
            const errBody = await resendRes.text();
            console.error(`DEMO_REQUEST_EMAIL_FAIL requestId=${savedId} status=${resendRes.status} body=${errBody}`);
            await db.update(demoRequests)
              .set({ status: "failed", errorMessage: `Email send failed: ${resendRes.status}`, updatedAt: new Date() })
              .where(eq(demoRequests.id, savedId));
          } else {
            await db.update(demoRequests)
              .set({ status: "fulfilled", updatedAt: new Date() })
              .where(eq(demoRequests.id, savedId));
            console.log(`DEMO_REQUEST_EMAIL_SENT requestId=${savedId}`);
          }
        } else {
          console.log(`DEMO_REQUEST_NOTIFY_TODO ${JSON.stringify({ requestId: savedId, companyName, workEmail, fullName, role, ts: new Date().toISOString() })}`);
          await db.update(demoRequests)
            .set({ status: "fulfilled", updatedAt: new Date() })
            .where(eq(demoRequests.id, savedId));
        }
      } catch (asyncErr: any) {
        console.error(`DEMO_REQUEST_ASYNC_ERROR requestId=${savedId}`, asyncErr?.message || asyncErr);
        try {
          await getDb().update(demoRequests)
            .set({ status: "failed", errorMessage: String(asyncErr?.message || "unknown").substring(0, 500), updatedAt: new Date() })
            .where(eq(demoRequests.id, savedId));
        } catch {}
      }
    });
  } catch (error) {
    console.error(`DEMO_REQUEST_ERROR requestId=${requestId}`, error);
    res.status(500).json({ ok: false, error: "Something went wrong. Please try again." });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/demo-request", handleDemoRequest);
  app.post("/api/request-demo", handleDemoRequest);

  app.use("/api", rlsMiddleware());

  async function resolveOrgId(req: any): Promise<string> {
    const orgId = req.query.orgId || req.headers['x-organization-id'];
    if (orgId && typeof orgId === 'string') return orgId;
    const orgs = await storage.getOrganizations();
    return orgs[0]?.id || '';
  }

  async function isDemoOrg(req: any): Promise<boolean> {
    const orgId = await resolveOrgId(req);
    if (!orgId) return false;
    const org = await storage.getOrganization(orgId);
    return org?.slug === "axiom-demo";
  }

  // Organizations
  app.get("/api/organizations", async (req, res) => {
    try {
      const orgs = await storage.getOrganizations();
      res.json(orgs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });

  app.get("/api/organizations/:slug", async (req, res) => {
    try {
      const org = await storage.getOrganizationBySlug(req.params.slug);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  // Users
  app.get("/api/users", async (req, res) => {
    try {
      const orgId = await resolveOrgId(req);
      const users = await storage.getAllUsers(orgId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Teams
  app.get("/api/teams", async (req, res) => {
    try {
      const orgId = await resolveOrgId(req);
      const teams = await storage.getAllTeams(orgId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  // Dashboard
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const orgId = await resolveOrgId(req);
      const stats = await storage.getDashboardStats(orgId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Decisions
  app.get("/api/decisions", async (req, res) => {
    try {
      const orgId = await resolveOrgId(req);
      const decisions = await storage.getAllDecisions(orgId);
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
      if (await isDemoOrg(req)) {
        return res.status(403).json({ error: "Modifications are disabled in the demo workspace." });
      }
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

      const orgId = await resolveOrgId(req);

      const decision = await storage.createDecision(
        orgId,
        {
          organizationId: orgId,
          title,
          ownerId,
          teamId: teamId || null,
          status: "draft",
          reviewByDate: reviewByDate ? new Date(reviewByDate) : null,
        },
        {
          organizationId: orgId,
          title,
          context,
          rationale,
          outcome,
          alternatives: alternatives || null,
          risks: risks || null,
          authorId: ownerId,
        },
        validAssumptions.map((a: { description: string; validUntil?: string }) => ({
          organizationId: orgId,
          description: a.description,
          status: "valid" as const,
          validUntil: a.validUntil ? new Date(a.validUntil) : null,
        }))
      );

      await storage.updateDecisionDebtScore(decision.id, calculateDebtScore(validAssumptions.length, 0));

      logDecision({
        organizationId: orgId,
        decisionType: "create_decision",
        sourceModule: "decisions",
        subjectType: "decision",
        subjectId: decision.id,
        metadata: { title, assumptionCount: validAssumptions.length },
        summaryText: `Decision created: "${title}" with ${validAssumptions.length} assumptions. ${rationale.substring(0, 300)}`,
        eventType: "created",
        actor: ownerId,
        auditSnapshot: { title, context, rationale, assumptionCount: validAssumptions.length },
      }).catch(() => {});

      res.json(decision);
    } catch (error) {
      console.error("Error creating decision:", error);
      res.status(500).json({ error: "Failed to create decision" });
    }
  });

  app.post("/api/decisions/:id/amend", async (req, res) => {
    try {
      if (await isDemoOrg(req)) {
        return res.status(403).json({ error: "Modifications are disabled in the demo workspace." });
      }
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

      const orgId = await resolveOrgId(req);

      const version = await storage.amendDecision(req.params.id, {
        organizationId: orgId,
        title: title || decision.title,
        context,
        rationale,
        outcome,
        alternatives: alternatives || null,
        risks: risks || null,
        authorId,
      });

      logDecision({
        organizationId: orgId,
        decisionType: "amend_decision",
        sourceModule: "decisions",
        subjectType: "decision",
        subjectId: req.params.id,
        metadata: { versionNumber: version.versionNumber, title: title || decision.title },
        summaryText: `Decision amended to version ${version.versionNumber}: "${title || decision.title}". ${rationale.substring(0, 300)}`,
        eventType: "evaluated",
        actor: authorId,
        auditSnapshot: { versionNumber: version.versionNumber, rationale, context },
      }).catch(() => {});

      res.json(version);
    } catch (error) {
      console.error("Error amending decision:", error);
      res.status(500).json({ error: "Failed to amend decision" });
    }
  });

  // Assumptions
  app.patch("/api/assumptions/:id", async (req, res) => {
    try {
      if (await isDemoOrg(req)) {
        return res.status(403).json({ error: "Modifications are disabled in the demo workspace." });
      }
      const parseResult = updateAssumptionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: parseResult.error.errors 
        });
      }

      const { status } = parseResult.data;
      
      const orgId = await resolveOrgId(req);
      const users = await storage.getAllUsers(orgId);
      const validatorId = users[0]?.id;

      if (!validatorId) {
        return res.status(400).json({ error: "No user available" });
      }

      const assumption = await storage.updateAssumptionStatus(req.params.id, status, validatorId);

      if (status === "invalidated") {
        const existingAssumption = await storage.getAssumption(req.params.id);
        if (existingAssumption) {
          const newAlert = await storage.createAlert({
            decisionId: existingAssumption.decisionId,
            organizationId: existingAssumption.organizationId,
            type: "assumption_expired",
            severity: "high",
            message: `Assumption invalidated: ${existingAssumption.description.substring(0, 100)}`,
            metadata: { assumptionId: existingAssumption.id },
          });

          logDecision({
            organizationId: orgId,
            decisionType: "create_alert",
            sourceModule: "alerts",
            subjectType: "alert",
            subjectId: newAlert.id,
            metadata: { axiomDecisionId: existingAssumption.decisionId, alertType: "assumption_expired", severity: "high" },
            summaryText: newAlert.message,
            eventType: "created",
            actor: validatorId,
            auditSnapshot: { alertType: "assumption_expired", severity: "high", message: newAlert.message },
          }).catch(() => {});
        }
      }

      const updatedAssumption = await storage.getAssumption(req.params.id);
      if (updatedAssumption) {
        logDecision({
          organizationId: orgId,
          decisionType: "assumption_change",
          sourceModule: "assumptions",
          subjectType: "assumption",
          subjectId: req.params.id,
          metadata: { axiomDecisionId: updatedAssumption.decisionId, newStatus: status },
          summaryText: `Assumption "${updatedAssumption.description.substring(0, 200)}" changed to ${status}`,
          eventType: "logged",
          actor: validatorId,
          auditSnapshot: { newStatus: status, description: updatedAssumption.description },
        }).catch(() => {});
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
      const orgId = await resolveOrgId(req);
      const alerts = await storage.getAllAlerts(orgId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts/:id/acknowledge", async (req, res) => {
    try {
      if (await isDemoOrg(req)) {
        return res.status(403).json({ error: "Modifications are disabled in the demo workspace." });
      }
      const orgId = await resolveOrgId(req);
      const users = await storage.getAllUsers(orgId);
      const userId = users[0]?.id;

      if (!userId) {
        return res.status(400).json({ error: "No user available" });
      }

      const alert = await storage.acknowledgeAlert(req.params.id, userId);

      logDecision({
        organizationId: orgId,
        decisionType: "acknowledge_alert",
        sourceModule: "alerts",
        subjectType: "alert",
        subjectId: req.params.id,
        metadata: { axiomDecisionId: alert.decisionId, alertType: alert.type, severity: alert.severity },
        summaryText: `Alert acknowledged: ${alert.message.substring(0, 300)}`,
        eventType: "logged",
        actor: userId,
        auditSnapshot: { alertType: alert.type, severity: alert.severity, message: alert.message },
      }).catch(() => {});

      res.json(alert);
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  });

  // ===== Company Brain V3: Action Proposals & Approvals =====

  app.get("/api/brain/proposals", async (req, res) => {
    try {
      const statusParam = z.enum(["pending", "approved", "rejected", "executed", "expired"]).optional().safeParse(req.query.status);
      const status = statusParam.success ? statusParam.data : undefined;
      const filters = status ? eq(actionProposal.status, status) : undefined;
      const proposals = await getDb().select().from(actionProposal).where(filters).orderBy(actionProposal.createdAt);
      res.json(proposals);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      res.status(500).json({ error: "Failed to fetch proposals" });
    }
  });

  app.post("/api/brain/proposals/:id/approve", async (req, res) => {
    try {
      if (await isDemoOrg(req)) {
        return res.status(403).json({ error: "Modifications are disabled in the demo workspace." });
      }
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
      if (await isDemoOrg(req)) {
        return res.status(403).json({ error: "Modifications are disabled in the demo workspace." });
      }
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
      const settings = await getDb().select().from(automationSettings).limit(1);
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
      if (await isDemoOrg(req)) {
        return res.status(403).json({ error: "Modifications are disabled in the demo workspace." });
      }
      const parseResult = z.object({
        enabled: z.boolean(),
        disabledReason: z.string().optional(),
        updatedBy: z.string().min(1),
      }).safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }

      const { enabled, disabledReason, updatedBy } = parseResult.data;

      const orgId = await resolveOrgId(req);

      const existing = await getDb().select().from(automationSettings).limit(1);
      if (existing.length === 0) {
        const [created] = await getDb().insert(automationSettings).values({
          organizationId: orgId,
          enabled,
          disabledReason: disabledReason || null,
          updatedBy,
        }).returning();
        return res.json(created);
      }

      const [updated] = await getDb()
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

  // ===== Company Brain V5: Replay Engine =====

  app.post("/api/brain/replay/:id", async (req, res) => {
    try {
      const result = await replayDecision(req.params.id);
      if (!result) {
        return res.status(404).json({ error: "Decision not found or replay failed" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error replaying decision:", error);
      res.status(500).json({ error: "Failed to replay decision" });
    }
  });

  // ===== Super Audit Layer: Access & Export Logging =====

  app.post("/api/brain/access-log", async (req, res) => {
    try {
      const parseResult = z.object({
        userId: z.string().min(1),
        decisionId: z.string().uuid(),
        ipAddress: z.string().optional(),
      }).safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }

      const orgId = await resolveOrgId(req);
      const [log] = await getDb().insert(auditAccessLog).values({
        organizationId: orgId,
        userId: parseResult.data.userId,
        decisionId: parseResult.data.decisionId,
        ipAddress: parseResult.data.ipAddress || null,
        accessedAt: new Date(),
      }).returning();

      res.json(log);
    } catch (error) {
      console.error("Error logging access:", error);
      res.status(500).json({ error: "Failed to log access" });
    }
  });

  const exportRateLimiter: Record<string, number[]> = {};
  const EXPORT_RATE_LIMIT = 10;
  const EXPORT_RATE_WINDOW_MS = 60000;

  app.post("/api/brain/export", async (req, res) => {
    try {
      const clientIp = req.ip || "unknown";
      const now = Date.now();
      if (!exportRateLimiter[clientIp]) exportRateLimiter[clientIp] = [];
      exportRateLimiter[clientIp] = exportRateLimiter[clientIp].filter((t) => now - t < EXPORT_RATE_WINDOW_MS);
      if (exportRateLimiter[clientIp].length >= EXPORT_RATE_LIMIT) {
        return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
      }
      exportRateLimiter[clientIp].push(now);

      const parseResult = z.object({
        decisionId: z.string().uuid(),
        exportType: z.enum(["PDF", "JSON", "CSV", "BUNDLE"]),
        exportPurpose: z.string().min(1),
        generatedBy: z.string().min(1),
      }).safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }

      const { decisionId, exportType, exportPurpose, generatedBy } = parseResult.data;

      const [decision] = await getDb().select().from(brainDecision).where(eq(brainDecision.id, decisionId));
      if (!decision) {
        return res.status(404).json({ error: "Decision not found" });
      }

      const snapshots = await getDb().select().from(decisionInputSnapshot).where(eq(decisionInputSnapshot.decisionId, decisionId));
      const rules = await getDb().select().from(decisionRuleHit).where(eq(decisionRuleHit.decisionId, decisionId));
      const principles = await getDb().select().from(principlesApplied).where(eq(principlesApplied.decisionId, decisionId));
      const overrides = await getDb().select().from(overrideHistory).where(eq(overrideHistory.decisionId, decisionId));
      const assumptions = await getDb().select().from(assumptionValidationHistory).where(eq(assumptionValidationHistory.decisionId, decisionId));

      const exportTimestamp = new Date().toISOString();

      const bundleHash = computeBundleHash({
        decisionData: decision as unknown as Record<string, unknown>,
        snapshot: (snapshots[0]?.inputJson as Record<string, unknown>) || {},
        rules,
        principles,
        overrides,
        assumptions,
        exportTimestamp,
      });

      const exportData = JSON.stringify({
        decision,
        snapshots,
        rules,
        principles,
        overrides,
        assumptions,
        exportTimestamp,
        bundleHash,
      });

      const exportFileSize = Buffer.byteLength(exportData, "utf8");

      const orgId = await resolveOrgId(req);
      const [exportLog] = await getDb().insert(auditExportLog).values({
        organizationId: orgId,
        decisionId,
        exportType,
        exportPurpose,
        generatedBy,
        generatedAt: new Date(),
        bundleHash,
        exportFileSize,
      }).returning();

      res.json({
        exportLog,
        bundleHash,
        exportFileSize,
        data: exportType === "JSON" ? JSON.parse(exportData) : undefined,
      });
    } catch (error) {
      console.error("Error exporting decision:", error);
      res.status(500).json({ error: "Failed to export decision" });
    }
  });

  // ===== Override History (for manual overrides) =====

  app.post("/api/brain/override", async (req, res) => {
    try {
      if (await isDemoOrg(req)) {
        return res.status(403).json({ error: "Modifications are disabled in the demo workspace." });
      }
      const parseResult = z.object({
        decisionId: z.string().uuid(),
        overriddenBy: z.string().min(1),
        role: z.string().min(1),
        previousOutcome: z.string().min(1),
        newOutcome: z.string().min(1),
        reason: z.string().min(1),
      }).safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }

      const orgId = await resolveOrgId(req);
      const [record] = await getDb().insert(overrideHistory).values({
        organizationId: orgId,
        ...parseResult.data,
        createdAt: new Date(),
      }).returning();

      res.json(record);
    } catch (error) {
      console.error("Error recording override:", error);
      res.status(500).json({ error: "Failed to record override" });
    }
  });

  // ===== Assumption Validation History =====

  app.post("/api/brain/assumption-validation", async (req, res) => {
    try {
      if (await isDemoOrg(req)) {
        return res.status(403).json({ error: "Modifications are disabled in the demo workspace." });
      }
      const parseResult = z.object({
        decisionId: z.string().uuid(),
        assumptionKey: z.string().min(1),
        oldStatus: z.string().min(1),
        newStatus: z.string().min(1),
        validatedBy: z.string().min(1),
      }).safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }

      const orgId = await resolveOrgId(req);
      const [record] = await getDb().insert(assumptionValidationHistory).values({
        organizationId: orgId,
        ...parseResult.data,
        validatedAt: new Date(),
      }).returning();

      res.json(record);
    } catch (error) {
      console.error("Error recording assumption validation:", error);
      res.status(500).json({ error: "Failed to record assumption validation" });
    }
  });

  // ===== Audit Trail (Read-Only) =====
  app.get("/api/audit", async (req, res) => {
    try {
      const {
        action,
        actor,
        resourceType,
        decisionId,
        dateFrom,
        dateTo,
        limit: limitParam,
        offset: offsetParam,
      } = req.query;

      const pageLimit = Math.min(Number(limitParam) || 50, 200);
      const pageOffset = Number(offsetParam) || 0;

      const db = getDb();

      const auditRows = await db
        .select({
          auditId: decisionAudit.auditId,
          decisionId: decisionAudit.decisionId,
          eventType: decisionAudit.eventType,
          actor: decisionAudit.actor,
          snapshot: decisionAudit.snapshot,
          createdAt: decisionAudit.createdAt,
          organizationId: decisionAudit.organizationId,
          logDecisionType: decisionLog.decisionType,
          logSourceModule: decisionLog.sourceModule,
          logSubjectType: decisionLog.subjectType,
          logSubjectId: decisionLog.subjectId,
          logMetadata: decisionLog.metadata,
          reasoningSummary: decisionReasoning.summaryText,
          reasoningConfidence: decisionReasoning.confidenceScore,
        })
        .from(decisionAudit)
        .leftJoin(decisionLog, eq(decisionAudit.decisionId, decisionLog.decisionId))
        .leftJoin(decisionReasoning, eq(decisionAudit.decisionId, decisionReasoning.decisionId))
        .where(
          and(
            ...[
              action && typeof action === "string"
                ? eq(decisionAudit.eventType, action)
                : undefined,
              actor && typeof actor === "string"
                ? ilike(decisionAudit.actor, `%${actor}%`)
                : undefined,
              resourceType && typeof resourceType === "string"
                ? eq(decisionLog.subjectType, resourceType)
                : undefined,
              decisionId && typeof decisionId === "string"
                ? eq(decisionAudit.decisionId, decisionId)
                : undefined,
              dateFrom && typeof dateFrom === "string"
                ? gte(decisionAudit.createdAt, new Date(dateFrom))
                : undefined,
              dateTo && typeof dateTo === "string"
                ? lte(decisionAudit.createdAt, new Date(dateTo))
                : undefined,
            ].filter(Boolean) as SQL[]
          )
        )
        .orderBy(desc(decisionAudit.createdAt))
        .limit(pageLimit + pageOffset);

      const accessRows = await db
        .select()
        .from(auditAccessLog)
        .where(
          and(
            ...[
              action && typeof action === "string" && action !== "access"
                ? sql`false`
                : undefined,
              actor && typeof actor === "string"
                ? ilike(auditAccessLog.userId, `%${actor}%`)
                : undefined,
              decisionId && typeof decisionId === "string"
                ? eq(auditAccessLog.decisionId, decisionId)
                : undefined,
              dateFrom && typeof dateFrom === "string"
                ? gte(auditAccessLog.accessedAt, new Date(dateFrom))
                : undefined,
              dateTo && typeof dateTo === "string"
                ? lte(auditAccessLog.accessedAt, new Date(dateTo))
                : undefined,
              resourceType && typeof resourceType === "string" && resourceType !== "decision"
                ? sql`false`
                : undefined,
            ].filter(Boolean) as SQL[]
          )
        )
        .orderBy(desc(auditAccessLog.accessedAt))
        .limit(pageLimit + pageOffset);

      const exportRows = await db
        .select()
        .from(auditExportLog)
        .where(
          and(
            ...[
              action && typeof action === "string" && action !== "export"
                ? sql`false`
                : undefined,
              actor && typeof actor === "string"
                ? ilike(auditExportLog.generatedBy, `%${actor}%`)
                : undefined,
              decisionId && typeof decisionId === "string"
                ? eq(auditExportLog.decisionId, decisionId)
                : undefined,
              dateFrom && typeof dateFrom === "string"
                ? gte(auditExportLog.generatedAt, new Date(dateFrom))
                : undefined,
              dateTo && typeof dateTo === "string"
                ? lte(auditExportLog.generatedAt, new Date(dateTo))
                : undefined,
              resourceType && typeof resourceType === "string" && resourceType !== "export"
                ? sql`false`
                : undefined,
            ].filter(Boolean) as SQL[]
          )
        )
        .orderBy(desc(auditExportLog.generatedAt))
        .limit(pageLimit + pageOffset);

      const unified: {
        id: string;
        timestamp: string;
        action: string;
        actor: string;
        resourceType: string;
        resourceId: string;
        status: string;
        source: string;
        metadata: Record<string, unknown>;
      }[] = [];

      for (const row of auditRows) {
        unified.push({
          id: row.auditId,
          timestamp: row.createdAt.toISOString(),
          action: row.eventType,
          actor: row.actor,
          resourceType: row.logSubjectType || "decision",
          resourceId: row.logSubjectId || row.decisionId,
          status: "recorded",
          source: "decision_audit",
          metadata: {
            decisionId: row.decisionId,
            decisionType: row.logDecisionType,
            sourceModule: row.logSourceModule,
            snapshot: row.snapshot,
            summary: row.reasoningSummary,
            confidenceScore: row.reasoningConfidence,
            logMetadata: row.logMetadata,
            organizationId: row.organizationId,
          },
        });
      }

      for (const row of accessRows) {
        unified.push({
          id: row.id,
          timestamp: row.accessedAt.toISOString(),
          action: "access",
          actor: row.userId,
          resourceType: "decision",
          resourceId: row.decisionId,
          status: "recorded",
          source: "audit_access_log",
          metadata: {
            decisionId: row.decisionId,
            ipAddress: row.ipAddress,
            organizationId: row.organizationId,
          },
        });
      }

      for (const row of exportRows) {
        unified.push({
          id: row.id,
          timestamp: row.generatedAt.toISOString(),
          action: "export",
          actor: row.generatedBy,
          resourceType: "export",
          resourceId: row.decisionId,
          status: "recorded",
          source: "audit_export_log",
          metadata: {
            decisionId: row.decisionId,
            exportType: row.exportType,
            exportPurpose: row.exportPurpose,
            bundleHash: row.bundleHash,
            exportFileSize: row.exportFileSize,
            organizationId: row.organizationId,
          },
        });
      }

      unified.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const total = unified.length;
      const paged = unified.slice(pageOffset, pageOffset + pageLimit);

      res.json({
        events: paged,
        total,
        limit: pageLimit,
        offset: pageOffset,
      });
    } catch (error) {
      console.error("Error fetching audit trail:", error);
      res.status(500).json({ error: "Failed to fetch audit trail" });
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
