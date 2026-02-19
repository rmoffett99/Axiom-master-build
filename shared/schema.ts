import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, pgEnum, uuid, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "owner", "contributor", "viewer", "board"]);
export const decisionStatusEnum = pgEnum("decision_status", ["draft", "published", "superseded"]);
export const assumptionStatusEnum = pgEnum("assumption_status", ["valid", "expired", "invalidated", "pending_review"]);
export const alertSeverityEnum = pgEnum("alert_severity", ["critical", "high", "medium", "low"]);
export const alertTypeEnum = pgEnum("alert_type", ["assumption_expired", "owner_departed", "review_overdue", "contradiction_detected", "high_debt_score"]);

// Organizations (tenants)
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// User-Organization membership
export const userOrganizations = pgTable("user_organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  organizationId: uuid("organization_id").notNull(),
  role: text("role").notNull().default("viewer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Users
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id"),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: userRoleEnum("role").notNull().default("viewer"),
  avatarUrl: text("avatar_url"),
  departedAt: timestamp("departed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Teams
export const teams = pgTable("teams", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id"),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Team Members junction
export const teamMembers = pgTable("team_members", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id"),
  teamId: varchar("team_id", { length: 36 }).notNull().references(() => teams.id),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// Decisions (main record)
export const decisions = pgTable("decisions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id"),
  title: text("title").notNull(),
  ownerId: varchar("owner_id", { length: 36 }).notNull().references(() => users.id),
  teamId: varchar("team_id", { length: 36 }).references(() => teams.id),
  status: decisionStatusEnum("status").notNull().default("draft"),
  currentVersionId: varchar("current_version_id", { length: 36 }),
  debtScore: integer("debt_score").default(0),
  reviewByDate: timestamp("review_by_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  publishedAt: timestamp("published_at"),
});

// Decision Versions (append-only)
export const decisionVersions = pgTable("decision_versions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id"),
  decisionId: varchar("decision_id", { length: 36 }).notNull().references(() => decisions.id),
  versionNumber: integer("version_number").notNull(),
  title: text("title").notNull(),
  context: text("context").notNull(),
  rationale: text("rationale").notNull(),
  outcome: text("outcome").notNull(),
  alternatives: text("alternatives"),
  risks: text("risks"),
  authorId: varchar("author_id", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Assumptions
export const assumptions = pgTable("assumptions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id"),
  decisionId: varchar("decision_id", { length: 36 }).notNull().references(() => decisions.id),
  description: text("description").notNull(),
  status: assumptionStatusEnum("status").notNull().default("valid"),
  validUntil: timestamp("valid_until"),
  validatedAt: timestamp("validated_at"),
  validatedById: varchar("validated_by_id", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Evidence Links
export const evidenceLinks = pgTable("evidence_links", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id"),
  decisionId: varchar("decision_id", { length: 36 }).notNull().references(() => decisions.id),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Decision Dependencies
export const dependencies = pgTable("dependencies", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id"),
  decisionId: varchar("decision_id", { length: 36 }).notNull().references(() => decisions.id),
  dependsOnId: varchar("depends_on_id", { length: 36 }).notNull().references(() => decisions.id),
  relationship: text("relationship"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Alerts
export const alerts = pgTable("alerts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id"),
  decisionId: varchar("decision_id", { length: 36 }).notNull().references(() => decisions.id),
  type: alertTypeEnum("type").notNull(),
  severity: alertSeverityEnum("severity").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedById: varchar("acknowledged_by_id", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Decision Debt Scores (historical)
export const decisionDebtScores = pgTable("decision_debt_scores", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id"),
  decisionId: varchar("decision_id", { length: 36 }).notNull().references(() => decisions.id),
  score: integer("score").notNull(),
  factors: jsonb("factors"),
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
});

// Audit Log (append-only)
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id"),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id", { length: 36 }).notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ===== Company Brain v1 (passive logging, 3 tables) =====
// Backend-only, fire-and-forget. No UI, no enforcement, no auto-execution.

export const decisionLog = pgTable("decision_log", {
  decisionId: uuid("decision_id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  decisionType: text("decision_type").notNull(),
  sourceModule: text("source_module").notNull(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const decisionReasoning = pgTable("decision_reasoning", {
  reasoningId: uuid("reasoning_id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  decisionId: uuid("decision_id").notNull(),
  summaryText: text("summary_text").notNull(),
  confidenceScore: doublePrecision("confidence_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const decisionAudit = pgTable("decision_audit", {
  auditId: uuid("audit_id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  decisionId: uuid("decision_id").notNull(),
  eventType: text("event_type").notNull(),
  actor: text("actor").notNull().default("system"),
  snapshot: jsonb("snapshot").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DecisionLog = typeof decisionLog.$inferSelect;
export type DecisionReasoning = typeof decisionReasoning.$inferSelect;
export type DecisionAudit = typeof decisionAudit.$inferSelect;

// ===== Company Brain v2 (principles, rules, rule hits) =====
// Backend-only, fire-and-forget. No UI, no enforcement, no auto-execution.

export const principle = pgTable("principle", {
  principleId: uuid("principle_id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  name: text("name").notNull(),
  statement: text("statement").notNull(),
  priority: integer("priority").notNull().default(50),
  domain: text("domain").notNull().default("general"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rule = pgTable("rule", {
  ruleId: uuid("rule_id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  name: text("name").notNull(),
  description: text("description"),
  domain: text("domain").notNull(),
  severity: text("severity").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  conditionExpr: text("condition_expr").notNull(),
  outcome: text("outcome").notNull(),
  params: jsonb("params").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const decisionRuleHit = pgTable("decision_rule_hit", {
  hitId: uuid("hit_id").defaultRandom().primaryKey(),
  decisionId: uuid("decision_id").notNull(),
  ruleId: uuid("rule_id").notNull(),
  ruleVersion: text("rule_version"),
  severity: text("severity"),
  hit: boolean("hit").notNull(),
  outcome: text("outcome"),
  hitDetails: jsonb("hit_details").notNull().default({}),
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Principle = typeof principle.$inferSelect;
export type Rule = typeof rule.$inferSelect;
export type DecisionRuleHit = typeof decisionRuleHit.$inferSelect;

// ===== Company Brain v3 (controlled actions + approvals) =====
// Backend-only. No autonomous execution. All actions require human approval.

export const action = pgTable("action", {
  actionId: uuid("action_id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  name: text("name").notNull(),
  actionType: text("action_type").notNull(),
  description: text("description"),
  reversible: boolean("reversible").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  params: jsonb("params").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const actionProposal = pgTable("action_proposal", {
  proposalId: uuid("proposal_id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  decisionId: uuid("decision_id").notNull(),
  ruleId: uuid("rule_id").notNull(),
  actionId: uuid("action_id"),
  ruleOutcome: text("rule_outcome").notNull(),
  status: text("status").notNull().default("pending"),
  metadata: jsonb("metadata").notNull().default({}),
  requestedByActor: text("requested_by_actor").notNull().default("system"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const actionApproval = pgTable("action_approval", {
  approvalId: uuid("approval_id").defaultRandom().primaryKey(),
  proposalId: uuid("proposal_id").notNull(),
  approverId: text("approver_id").notNull(),
  approverRole: text("approver_role").notNull(),
  status: text("status").notNull(),
  reason: text("reason"),
  approvedAt: timestamp("approved_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const actionExecution = pgTable("action_execution", {
  executionId: uuid("execution_id").defaultRandom().primaryKey(),
  proposalId: uuid("proposal_id").notNull(),
  executedBy: text("executed_by").notNull(),
  status: text("status").notNull(),
  result: jsonb("result").notNull().default({}),
  executedAt: timestamp("executed_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const automationSettings = pgTable("automation_settings", {
  settingsId: uuid("settings_id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  enabled: boolean("enabled").notNull().default(false),
  disabledReason: text("disabled_reason"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Action = typeof action.$inferSelect;
export type ActionProposal = typeof actionProposal.$inferSelect;
export type ActionApproval = typeof actionApproval.$inferSelect;
export type ActionExecution = typeof actionExecution.$inferSelect;
export type AutomationSettings = typeof automationSettings.$inferSelect;

// ===== Company Brain V1 Core Lock — Enterprise Decision Record =====
// Comprehensive decision table per Master Work Order spec.
// All integrity fields computed at INSERT time only. Never recomputed.

export const brainDecision = pgTable("brain_decision", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  domain: text("domain").notNull(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  triggeredBy: text("triggered_by").notNull().default("system"),
  modelVersion: text("model_version").notNull().default("v1.0"),
  confidenceScore: doublePrecision("confidence_score"),
  alignmentScore: doublePrecision("alignment_score").notNull().default(0),
  alignmentScoreVersion: text("alignment_score_version").notNull().default("v1.0"),
  alignmentFormulaVersion: text("alignment_formula_version").notNull().default("v1.0-2026Q1"),
  alignmentScoreComputedAt: timestamp("alignment_score_computed_at", { withTimezone: true }).notNull().defaultNow(),
  outcome: text("outcome").notNull(),
  status: text("status").notNull().default("recorded"),
  snapshotHash: text("snapshot_hash").notNull(),
  decisionHash: text("decision_hash").notNull(),
  decisionFingerprint: text("decision_fingerprint").notNull().unique(),
  hashTimestamp: text("hash_timestamp").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const decisionInputSnapshot = pgTable("decision_input_snapshot", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  decisionId: uuid("decision_id").notNull(),
  inputJson: jsonb("input_json").notNull(),
  hash: text("hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const principlesApplied = pgTable("principles_applied", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  decisionId: uuid("decision_id").notNull(),
  principleId: uuid("principle_id").notNull(),
  principleVersion: text("principle_version").notNull().default("v1.0"),
  priority: integer("priority").notNull().default(50),
  applied: boolean("applied").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const overrideHistory = pgTable("override_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  decisionId: uuid("decision_id").notNull(),
  overriddenBy: text("overridden_by").notNull(),
  role: text("role").notNull(),
  previousOutcome: text("previous_outcome").notNull(),
  newOutcome: text("new_outcome").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assumptionValidationHistory = pgTable("assumption_validation_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  decisionId: uuid("decision_id").notNull(),
  assumptionKey: text("assumption_key").notNull(),
  oldStatus: text("old_status").notNull(),
  newStatus: text("new_status").notNull(),
  validatedBy: text("validated_by").notNull(),
  validatedAt: timestamp("validated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const driftMetrics = pgTable("drift_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  metricName: text("metric_name").notNull(),
  baselineValue: doublePrecision("baseline_value").notNull(),
  currentValue: doublePrecision("current_value").notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  decisionContext: text("decision_context"),
});

// ===== Super Audit Layer (V3 of Master Work Order) =====

export const auditAccessLog = pgTable("audit_access_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  userId: text("user_id").notNull(),
  decisionId: uuid("decision_id").notNull(),
  accessedAt: timestamp("accessed_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
});

export const auditExportLog = pgTable("audit_export_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  decisionId: uuid("decision_id").notNull(),
  exportType: text("export_type").notNull(),
  exportPurpose: text("export_purpose").notNull(),
  generatedBy: text("generated_by").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  bundleHash: text("bundle_hash").notNull(),
  exportFileSize: integer("export_file_size"),
});

// ===== Replay Engine (V5 of Master Work Order) =====

export const replayMismatchAlerts = pgTable("replay_mismatch_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id"),
  decisionId: uuid("decision_id").notNull(),
  replayedOutcome: text("replayed_outcome").notNull(),
  historicalOutcome: text("historical_outcome").notNull(),
  delta: doublePrecision("delta"),
  severity: text("severity").notNull(),
  replayedAt: timestamp("replayed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BrainDecision = typeof brainDecision.$inferSelect;
export type DecisionInputSnapshot = typeof decisionInputSnapshot.$inferSelect;
export type PrinciplesApplied = typeof principlesApplied.$inferSelect;
export type OverrideHistory = typeof overrideHistory.$inferSelect;
export type AssumedValidationHistory = typeof assumptionValidationHistory.$inferSelect;
export type DriftMetric = typeof driftMetrics.$inferSelect;
export type AuditAccessLog = typeof auditAccessLog.$inferSelect;
export type AuditExportLog = typeof auditExportLog.$inferSelect;
export type ReplayMismatchAlert = typeof replayMismatchAlerts.$inferSelect;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;
export type UserOrganization = typeof userOrganizations.$inferSelect;

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export const insertDecisionSchema = createInsertSchema(decisions).omit({ id: true, createdAt: true, currentVersionId: true, debtScore: true });
export const insertDecisionVersionSchema = createInsertSchema(decisionVersions).omit({ id: true, createdAt: true });
export const insertAssumptionSchema = createInsertSchema(assumptions).omit({ id: true, createdAt: true, validatedAt: true, validatedById: true });
export const insertEvidenceLinkSchema = createInsertSchema(evidenceLinks).omit({ id: true, createdAt: true });
export const insertDependencySchema = createInsertSchema(dependencies).omit({ id: true, createdAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true, acknowledgedAt: true, acknowledgedById: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertDecision = z.infer<typeof insertDecisionSchema>;
export type Decision = typeof decisions.$inferSelect;
export type InsertDecisionVersion = z.infer<typeof insertDecisionVersionSchema>;
export type DecisionVersion = typeof decisionVersions.$inferSelect;
export type InsertAssumption = z.infer<typeof insertAssumptionSchema>;
export type Assumption = typeof assumptions.$inferSelect;
export type InsertEvidenceLink = z.infer<typeof insertEvidenceLinkSchema>;
export type EvidenceLink = typeof evidenceLinks.$inferSelect;
export type InsertDependency = z.infer<typeof insertDependencySchema>;
export type Dependency = typeof dependencies.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type DecisionDebtScore = typeof decisionDebtScores.$inferSelect;

// Extended types for frontend
export interface DecisionWithDetails extends Decision {
  owner?: User;
  team?: Team;
  assumptions?: Assumption[];
  currentVersion?: DecisionVersion;
  alertCount?: number;
}

export interface DashboardStats {
  totalDecisions: number;
  avgDebtScore: number;
  criticalAlerts: number;
  expiringSoon: number;
  debtTrend: { date: string; score: number }[];
  topRiskyDecisions: DecisionWithDetails[];
}
