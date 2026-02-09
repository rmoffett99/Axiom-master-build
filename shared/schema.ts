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

// Users
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
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
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Team Members junction
export const teamMembers = pgTable("team_members", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id", { length: 36 }).notNull().references(() => teams.id),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// Decisions (main record)
export const decisions = pgTable("decisions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
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
  decisionId: varchar("decision_id", { length: 36 }).notNull().references(() => decisions.id),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Decision Dependencies
export const dependencies = pgTable("dependencies", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  decisionId: varchar("decision_id", { length: 36 }).notNull().references(() => decisions.id),
  dependsOnId: varchar("depends_on_id", { length: 36 }).notNull().references(() => decisions.id),
  relationship: text("relationship"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Alerts
export const alerts = pgTable("alerts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
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
  decisionId: varchar("decision_id", { length: 36 }).notNull().references(() => decisions.id),
  score: integer("score").notNull(),
  factors: jsonb("factors"),
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
});

// Audit Log (append-only)
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
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
  orgId: uuid("org_id"),
  decisionType: text("decision_type").notNull(),
  sourceModule: text("source_module").notNull(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const decisionReasoning = pgTable("decision_reasoning", {
  reasoningId: uuid("reasoning_id").defaultRandom().primaryKey(),
  decisionId: uuid("decision_id").notNull(),
  summaryText: text("summary_text").notNull(),
  confidenceScore: doublePrecision("confidence_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const decisionAudit = pgTable("decision_audit", {
  auditId: uuid("audit_id").defaultRandom().primaryKey(),
  decisionId: uuid("decision_id").notNull(),
  eventType: text("event_type").notNull(),
  actor: text("actor").notNull().default("system"),
  snapshot: jsonb("snapshot").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DecisionLog = typeof decisionLog.$inferSelect;
export type DecisionReasoning = typeof decisionReasoning.$inferSelect;
export type DecisionAudit = typeof decisionAudit.$inferSelect;

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
