import { getDb, getCurrentOrgId } from "./rls";
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
  organizations,
  userOrganizations,
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
  type Organization,
  type UserOrganization,
} from "@shared/schema";

export interface IStorage {
  // Organizations
  getOrganizations(): Promise<Organization[]>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getOrganization(id: string): Promise<Organization | undefined>;
  getUserOrganizations(userId: string): Promise<(UserOrganization & { organization: Organization })[]>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(organizationId: string): Promise<User[]>;

  // Teams
  getTeam(id: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  getAllTeams(organizationId: string): Promise<Team[]>;

  // Decisions
  getDecision(id: string): Promise<DecisionWithDetails | undefined>;
  getAllDecisions(organizationId: string): Promise<DecisionWithDetails[]>;
  createDecision(organizationId: string, decision: InsertDecision, version: Omit<InsertDecisionVersion, "decisionId" | "versionNumber">, assumptions: Omit<InsertAssumption, "decisionId">[]): Promise<Decision>;
  amendDecision(decisionId: string, version: Omit<InsertDecisionVersion, "decisionId" | "versionNumber">): Promise<DecisionVersion>;
  updateDecisionDebtScore(decisionId: string, score: number): Promise<void>;

  // Assumptions
  getAssumption(id: string): Promise<Assumption | undefined>;
  updateAssumptionStatus(id: string, status: string, validatedById: string): Promise<Assumption>;
  getAssumptionsByDecision(decisionId: string): Promise<Assumption[]>;

  // Alerts
  getAllAlerts(organizationId: string): Promise<(Alert & { decision?: Decision })[]>;
  getAlertsByDecision(decisionId: string): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  acknowledgeAlert(alertId: string, userId: string): Promise<Alert>;

  // Dashboard
  getDashboardStats(organizationId: string): Promise<{
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
  // Organizations
  async getOrganizations(): Promise<Organization[]> {
    return getDb().select().from(organizations);
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await getDb().select().from(organizations).where(eq(organizations.slug, slug));
    return org;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await getDb().select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getUserOrganizations(userId: string): Promise<(UserOrganization & { organization: Organization })[]> {
    const memberships = await getDb().select().from(userOrganizations).where(eq(userOrganizations.userId, userId));
    const result: (UserOrganization & { organization: Organization })[] = [];
    for (const m of memberships) {
      const [org] = await getDb().select().from(organizations).where(eq(organizations.id, m.organizationId));
      if (org) result.push({ ...m, organization: org });
    }
    return result;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await getDb().select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await getDb().select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await getDb().insert(users).values(user).returning();
    return newUser;
  }

  async getAllUsers(organizationId: string): Promise<User[]> {
    return getDb().select().from(users).where(eq(users.organizationId, organizationId));
  }

  // Teams
  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await getDb().select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await getDb().insert(teams).values(team).returning();
    return newTeam;
  }

  async getAllTeams(organizationId: string): Promise<Team[]> {
    return getDb().select().from(teams).where(eq(teams.organizationId, organizationId));
  }

  // Decisions
  async getDecision(id: string): Promise<DecisionWithDetails | undefined> {
    const [decision] = await getDb().select().from(decisions).where(eq(decisions.id, id));
    if (!decision) return undefined;

    const owner = decision.ownerId ? await this.getUser(decision.ownerId) : undefined;
    const team = decision.teamId ? await this.getTeam(decision.teamId) : undefined;
    const decisionAssumptions = await this.getAssumptionsByDecision(id);
    const decisionAlerts = await this.getAlertsByDecision(id);
    
    let currentVersion: DecisionVersion | undefined;
    if (decision.currentVersionId) {
      const [version] = await getDb().select().from(decisionVersions).where(eq(decisionVersions.id, decision.currentVersionId));
      currentVersion = version;
    }

    const allVersions = await getDb()
      .select()
      .from(decisionVersions)
      .where(eq(decisionVersions.decisionId, id))
      .orderBy(desc(decisionVersions.versionNumber));

    const evidenceList = await getDb()
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

  async getAllDecisions(organizationId: string): Promise<DecisionWithDetails[]> {
    const allDecisions = await getDb()
      .select()
      .from(decisions)
      .where(eq(decisions.organizationId, organizationId))
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
    organizationId: string,
    decision: InsertDecision,
    version: Omit<InsertDecisionVersion, "decisionId" | "versionNumber">,
    assumptionsList: Omit<InsertAssumption, "decisionId">[]
  ): Promise<Decision> {
    const [newDecision] = await getDb()
      .insert(decisions)
      .values({
        ...decision,
        status: "published",
        publishedAt: new Date(),
      })
      .returning();

    const [newVersion] = await getDb()
      .insert(decisionVersions)
      .values({
        decisionId: newDecision.id,
        versionNumber: 1,
        ...version,
      })
      .returning();

    await getDb()
      .update(decisions)
      .set({ currentVersionId: newVersion.id })
      .where(eq(decisions.id, newDecision.id));

    for (const assumption of assumptionsList) {
      await getDb().insert(assumptions).values({
        decisionId: newDecision.id,
        ...assumption,
      });
    }

    await this.createAuditLog({
      organizationId,
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
    const [existingDecision] = await getDb().select().from(decisions).where(eq(decisions.id, decisionId));
    const orgId = existingDecision?.organizationId || getCurrentOrgId() || '';

    const existingVersions = await getDb()
      .select()
      .from(decisionVersions)
      .where(eq(decisionVersions.decisionId, decisionId))
      .orderBy(desc(decisionVersions.versionNumber));

    const nextVersionNumber = existingVersions.length > 0 
      ? existingVersions[0].versionNumber + 1 
      : 1;

    const [newVersion] = await getDb()
      .insert(decisionVersions)
      .values({
        decisionId,
        versionNumber: nextVersionNumber,
        ...version,
      })
      .returning();

    await getDb()
      .update(decisions)
      .set({ currentVersionId: newVersion.id })
      .where(eq(decisions.id, decisionId));

    await this.createAuditLog({
      organizationId: orgId,
      userId: version.authorId,
      action: "decision_amended",
      entityType: "decision",
      entityId: decisionId,
      details: { versionNumber: nextVersionNumber },
    });

    return newVersion;
  }

  async updateDecisionDebtScore(decisionId: string, score: number): Promise<void> {
    await getDb()
      .update(decisions)
      .set({ debtScore: score })
      .where(eq(decisions.id, decisionId));

    await getDb().insert(decisionDebtScores).values({
      decisionId,
      organizationId: getCurrentOrgId()!,
      score,
      factors: {},
    });
  }

  // Assumptions
  async getAssumption(id: string): Promise<Assumption | undefined> {
    const [assumption] = await getDb().select().from(assumptions).where(eq(assumptions.id, id));
    return assumption;
  }

  async updateAssumptionStatus(id: string, status: string, validatedById: string): Promise<Assumption> {
    const [updated] = await getDb()
      .update(assumptions)
      .set({
        status: status as "valid" | "expired" | "invalidated" | "pending_review",
        validatedAt: new Date(),
        validatedById,
      })
      .where(eq(assumptions.id, id))
      .returning();

    const assumption = await this.getAssumption(id);
    if (assumption) {
      await this.createAuditLog({
        organizationId: assumption.organizationId,
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
    return getDb()
      .select()
      .from(assumptions)
      .where(eq(assumptions.decisionId, decisionId));
  }

  // Alerts
  async getAllAlerts(organizationId: string): Promise<(Alert & { decision?: Decision })[]> {
    const allAlerts = await getDb()
      .select()
      .from(alerts)
      .where(eq(alerts.organizationId, organizationId))
      .orderBy(desc(alerts.createdAt));

    const result: (Alert & { decision?: Decision })[] = [];
    for (const alert of allAlerts) {
      const [decision] = await getDb().select().from(decisions).where(
        and(eq(decisions.id, alert.decisionId), eq(decisions.organizationId, organizationId))
      );
      result.push({ ...alert, decision });
    }

    return result;
  }

  async getAlertsByDecision(decisionId: string): Promise<Alert[]> {
    return getDb()
      .select()
      .from(alerts)
      .where(eq(alerts.decisionId, decisionId))
      .orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await getDb().insert(alerts).values(alert).returning();
    return newAlert;
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<Alert> {
    const [updated] = await getDb()
      .update(alerts)
      .set({
        acknowledgedAt: new Date(),
        acknowledgedById: userId,
      })
      .where(eq(alerts.id, alertId))
      .returning();

    await this.createAuditLog({
      organizationId: getCurrentOrgId()!,
      userId,
      action: "alert_acknowledged",
      entityType: "alert",
      entityId: alertId,
      details: {},
    });

    return updated;
  }

  // Dashboard
  async getDashboardStats(organizationId: string): Promise<{
    totalDecisions: number;
    avgDebtScore: number;
    criticalAlerts: number;
    expiringSoon: number;
    debtTrend: { date: string; score: number }[];
    topRiskyDecisions: DecisionWithDetails[];
  }> {
    const allDecisions = await this.getAllDecisions(organizationId);
    const totalDecisions = allDecisions.length;

    const avgDebtScore = allDecisions.length > 0
      ? Math.round(allDecisions.reduce((sum, d) => sum + (d.debtScore || 0), 0) / allDecisions.length)
      : 0;

    const allAlerts = await getDb()
      .select()
      .from(alerts)
      .where(and(
        eq(alerts.organizationId, organizationId),
        eq(alerts.severity, "critical"),
        sql`${alerts.acknowledgedAt} IS NULL`
      ));
    const criticalAlerts = allAlerts.length;

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringSoon = allDecisions.filter(d => {
      if (!d.reviewByDate) return false;
      const reviewDate = new Date(d.reviewByDate);
      return reviewDate <= thirtyDaysFromNow && reviewDate > new Date();
    }).length;

    const historicalScores = await getDb()
      .select()
      .from(decisionDebtScores)
      .orderBy(desc(decisionDebtScores.calculatedAt));
    
    const debtTrend: { date: string; score: number }[] = [];
    
    if (historicalScores.length > 0) {
      const scoresByDate = new Map<string, number[]>();
      for (const score of historicalScores) {
        const dateKey = new Date(score.calculatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (!scoresByDate.has(dateKey)) {
          scoresByDate.set(dateKey, []);
        }
        scoresByDate.get(dateKey)!.push(score.score);
      }
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const scores = scoresByDate.get(dateKey);
        
        if (scores && scores.length > 0) {
          const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
          debtTrend.push({ date: dateKey, score: avg });
        } else {
          debtTrend.push({ date: dateKey, score: avgDebtScore });
        }
      }
    } else {
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        debtTrend.push({
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          score: avgDebtScore,
        });
      }
    }

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
    const [newLog] = await getDb().insert(auditLogs).values(log).returning();
    return newLog;
  }
}

export const storage = new DatabaseStorage();
