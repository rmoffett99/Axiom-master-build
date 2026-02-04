import { db } from "./db";
import { eq, desc, and, lte, gte, sql } from "drizzle-orm";
import {
  users,
  teams,
  teamMembers,
  decisions,
  decisionVersions,
  assumptions,
  evidenceLinks,
  dependencies,
  alerts,
  decisionDebtScores,
  auditLogs,
  type User,
  type InsertUser,
  type Team,
  type InsertTeam,
  type Decision,
  type InsertDecision,
  type DecisionVersion,
  type InsertDecisionVersion,
  type Assumption,
  type InsertAssumption,
  type EvidenceLink,
  type InsertEvidenceLink,
  type Dependency,
  type InsertDependency,
  type Alert,
  type InsertAlert,
  type DecisionDebtScore,
  type AuditLog,
  type InsertAuditLog,
  type DecisionWithDetails,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Teams
  getTeam(id: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  getAllTeams(): Promise<Team[]>;

  // Decisions
  getDecision(id: string): Promise<DecisionWithDetails | undefined>;
  getAllDecisions(): Promise<DecisionWithDetails[]>;
  createDecision(decision: InsertDecision, version: Omit<InsertDecisionVersion, "decisionId" | "versionNumber">, assumptions: Omit<InsertAssumption, "decisionId">[]): Promise<Decision>;
  amendDecision(decisionId: string, version: Omit<InsertDecisionVersion, "decisionId" | "versionNumber">): Promise<DecisionVersion>;
  updateDecisionDebtScore(decisionId: string, score: number): Promise<void>;

  // Assumptions
  getAssumption(id: string): Promise<Assumption | undefined>;
  updateAssumptionStatus(id: string, status: string, validatedById: string): Promise<Assumption>;
  getAssumptionsByDecision(decisionId: string): Promise<Assumption[]>;

  // Alerts
  getAllAlerts(): Promise<(Alert & { decision?: Decision })[]>;
  getAlertsByDecision(decisionId: string): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  acknowledgeAlert(alertId: string, userId: string): Promise<Alert>;

  // Dashboard
  getDashboardStats(): Promise<{
    totalDecisions: number;
    avgDebtScore: number;
    criticalAlerts: number;
    expiringSoon: number;
    debtTrend: { date: string; score: number }[];
    topRiskyDecisions: DecisionWithDetails[];
  }>;

  // Audit
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  // Teams
  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async getAllTeams(): Promise<Team[]> {
    return db.select().from(teams);
  }

  // Decisions
  async getDecision(id: string): Promise<DecisionWithDetails | undefined> {
    const [decision] = await db.select().from(decisions).where(eq(decisions.id, id));
    if (!decision) return undefined;

    const owner = decision.ownerId ? await this.getUser(decision.ownerId) : undefined;
    const team = decision.teamId ? await this.getTeam(decision.teamId) : undefined;
    const decisionAssumptions = await this.getAssumptionsByDecision(id);
    const decisionAlerts = await this.getAlertsByDecision(id);
    
    let currentVersion: DecisionVersion | undefined;
    if (decision.currentVersionId) {
      const [version] = await db.select().from(decisionVersions).where(eq(decisionVersions.id, decision.currentVersionId));
      currentVersion = version;
    }

    const allVersions = await db
      .select()
      .from(decisionVersions)
      .where(eq(decisionVersions.decisionId, id))
      .orderBy(desc(decisionVersions.versionNumber));

    const evidenceList = await db
      .select()
      .from(evidenceLinks)
      .where(eq(evidenceLinks.decisionId, id));

    return {
      ...decision,
      owner,
      team,
      assumptions: decisionAssumptions,
      currentVersion,
      versions: allVersions,
      evidence: evidenceList,
      alerts: decisionAlerts,
      alertCount: decisionAlerts.filter(a => !a.acknowledgedAt).length,
    } as DecisionWithDetails & { versions: DecisionVersion[]; evidence: EvidenceLink[]; alerts: Alert[] };
  }

  async getAllDecisions(): Promise<DecisionWithDetails[]> {
    const allDecisions = await db
      .select()
      .from(decisions)
      .orderBy(desc(decisions.createdAt));

    const result: DecisionWithDetails[] = [];
    for (const decision of allDecisions) {
      const owner = decision.ownerId ? await this.getUser(decision.ownerId) : undefined;
      const team = decision.teamId ? await this.getTeam(decision.teamId) : undefined;
      const decisionAssumptions = await this.getAssumptionsByDecision(decision.id);
      const decisionAlerts = await this.getAlertsByDecision(decision.id);
      
      result.push({
        ...decision,
        owner,
        team,
        assumptions: decisionAssumptions,
        alertCount: decisionAlerts.filter(a => !a.acknowledgedAt).length,
      });
    }

    return result;
  }

  async createDecision(
    decision: InsertDecision,
    version: Omit<InsertDecisionVersion, "decisionId" | "versionNumber">,
    assumptionsList: Omit<InsertAssumption, "decisionId">[]
  ): Promise<Decision> {
    // Create the decision
    const [newDecision] = await db
      .insert(decisions)
      .values({
        ...decision,
        status: "published",
        publishedAt: new Date(),
      })
      .returning();

    // Create the first version
    const [newVersion] = await db
      .insert(decisionVersions)
      .values({
        decisionId: newDecision.id,
        versionNumber: 1,
        ...version,
      })
      .returning();

    // Update decision with current version
    await db
      .update(decisions)
      .set({ currentVersionId: newVersion.id })
      .where(eq(decisions.id, newDecision.id));

    // Create assumptions
    for (const assumption of assumptionsList) {
      await db.insert(assumptions).values({
        decisionId: newDecision.id,
        ...assumption,
      });
    }

    // Create audit log
    await this.createAuditLog({
      userId: decision.ownerId,
      action: "decision_created",
      entityType: "decision",
      entityId: newDecision.id,
      details: { title: decision.title },
    });

    return newDecision;
  }

  async amendDecision(
    decisionId: string,
    version: Omit<InsertDecisionVersion, "decisionId" | "versionNumber">
  ): Promise<DecisionVersion> {
    // Get current version number
    const existingVersions = await db
      .select()
      .from(decisionVersions)
      .where(eq(decisionVersions.decisionId, decisionId))
      .orderBy(desc(decisionVersions.versionNumber));

    const nextVersionNumber = existingVersions.length > 0 
      ? existingVersions[0].versionNumber + 1 
      : 1;

    // Create new version
    const [newVersion] = await db
      .insert(decisionVersions)
      .values({
        decisionId,
        versionNumber: nextVersionNumber,
        ...version,
      })
      .returning();

    // Update decision with new current version
    await db
      .update(decisions)
      .set({ currentVersionId: newVersion.id })
      .where(eq(decisions.id, decisionId));

    // Create audit log
    await this.createAuditLog({
      userId: version.authorId,
      action: "decision_amended",
      entityType: "decision",
      entityId: decisionId,
      details: { versionNumber: nextVersionNumber },
    });

    return newVersion;
  }

  async updateDecisionDebtScore(decisionId: string, score: number): Promise<void> {
    await db
      .update(decisions)
      .set({ debtScore: score })
      .where(eq(decisions.id, decisionId));

    // Store historical score
    await db.insert(decisionDebtScores).values({
      decisionId,
      score,
      factors: {},
    });
  }

  // Assumptions
  async getAssumption(id: string): Promise<Assumption | undefined> {
    const [assumption] = await db.select().from(assumptions).where(eq(assumptions.id, id));
    return assumption;
  }

  async updateAssumptionStatus(id: string, status: string, validatedById: string): Promise<Assumption> {
    const [updated] = await db
      .update(assumptions)
      .set({
        status: status as "valid" | "expired" | "invalidated" | "pending_review",
        validatedAt: new Date(),
        validatedById,
      })
      .where(eq(assumptions.id, id))
      .returning();

    // Create audit log
    const assumption = await this.getAssumption(id);
    if (assumption) {
      await this.createAuditLog({
        userId: validatedById,
        action: "assumption_status_changed",
        entityType: "assumption",
        entityId: id,
        details: { status, decisionId: assumption.decisionId },
      });
    }

    return updated;
  }

  async getAssumptionsByDecision(decisionId: string): Promise<Assumption[]> {
    return db
      .select()
      .from(assumptions)
      .where(eq(assumptions.decisionId, decisionId));
  }

  // Alerts
  async getAllAlerts(): Promise<(Alert & { decision?: Decision })[]> {
    const allAlerts = await db
      .select()
      .from(alerts)
      .orderBy(desc(alerts.createdAt));

    const result: (Alert & { decision?: Decision })[] = [];
    for (const alert of allAlerts) {
      const [decision] = await db.select().from(decisions).where(eq(decisions.id, alert.decisionId));
      result.push({ ...alert, decision });
    }

    return result;
  }

  async getAlertsByDecision(decisionId: string): Promise<Alert[]> {
    return db
      .select()
      .from(alerts)
      .where(eq(alerts.decisionId, decisionId))
      .orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db.insert(alerts).values(alert).returning();
    return newAlert;
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<Alert> {
    const [updated] = await db
      .update(alerts)
      .set({
        acknowledgedAt: new Date(),
        acknowledgedById: userId,
      })
      .where(eq(alerts.id, alertId))
      .returning();

    // Create audit log
    await this.createAuditLog({
      userId,
      action: "alert_acknowledged",
      entityType: "alert",
      entityId: alertId,
      details: {},
    });

    return updated;
  }

  // Dashboard
  async getDashboardStats(): Promise<{
    totalDecisions: number;
    avgDebtScore: number;
    criticalAlerts: number;
    expiringSoon: number;
    debtTrend: { date: string; score: number }[];
    topRiskyDecisions: DecisionWithDetails[];
  }> {
    // Get all decisions
    const allDecisions = await this.getAllDecisions();
    const totalDecisions = allDecisions.length;

    // Calculate average debt score
    const avgDebtScore = allDecisions.length > 0
      ? Math.round(allDecisions.reduce((sum, d) => sum + (d.debtScore || 0), 0) / allDecisions.length)
      : 0;

    // Count critical alerts
    const allAlerts = await db
      .select()
      .from(alerts)
      .where(and(
        eq(alerts.severity, "critical"),
        sql`${alerts.acknowledgedAt} IS NULL`
      ));
    const criticalAlerts = allAlerts.length;

    // Count expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringSoon = allDecisions.filter(d => {
      if (!d.reviewByDate) return false;
      const reviewDate = new Date(d.reviewByDate);
      return reviewDate <= thirtyDaysFromNow && reviewDate > new Date();
    }).length;

    // Generate mock debt trend (last 30 days)
    const debtTrend: { date: string; score: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      debtTrend.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        score: Math.max(0, avgDebtScore + Math.floor(Math.random() * 20) - 10),
      });
    }

    // Get top risky decisions
    const topRiskyDecisions = [...allDecisions]
      .sort((a, b) => (b.debtScore || 0) - (a.debtScore || 0))
      .slice(0, 10);

    return {
      totalDecisions,
      avgDebtScore,
      criticalAlerts,
      expiringSoon,
      debtTrend,
      topRiskyDecisions,
    };
  }

  // Audit
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }
}

export const storage = new DatabaseStorage();
