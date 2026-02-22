import { db as globalDb } from "./db";
import { getDb, withOrgContext } from "./rls";
import { 
  users, 
  teams, 
  decisions, 
  decisionVersions, 
  assumptions, 
  alerts,
  evidenceLinks,
  organizations,
  auditLogs
} from "@shared/schema";
import { eq } from "drizzle-orm";

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
const SECOND_ORG_ID = '00000000-0000-0000-0000-000000000002';

const FIXED_DATE = new Date("2026-01-15T09:00:00.000Z");
function daysFromBase(days: number): Date {
  return new Date(FIXED_DATE.getTime() + days * 24 * 60 * 60 * 1000);
}

async function ensureOrganizations() {
  const existingOrgs = await globalDb.select().from(organizations);
  if (existingOrgs.length > 0) return;

  console.log("Seeding organizations...");
  await globalDb.insert(organizations).values([
    { id: DEFAULT_ORG_ID, name: "Axiom Demo Organization", slug: "axiom-demo", status: "active", orgType: "root" },
    { id: SECOND_ORG_ID, name: "Acme Corp", slug: "acme-corp", status: "active", orgType: "root" },
  ]);
  console.log("Organizations seeded.");
}

export async function seedDatabase() {
  console.log("Checking if database needs seeding...");

  await ensureOrganizations();

  return withOrgContext(DEFAULT_ORG_ID, async () => {
    const db = getDb();
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      console.log("Database already has data, skipping seed.");
      return;
    }

  console.log("Seeding database with initial data...");

  const [demoAdmin] = await db.insert(users).values({
    username: "demo-admin",
    email: "admin@axiom-demo.com",
    displayName: "Demo Admin",
    role: "admin",
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [demoViewer] = await db.insert(users).values({
    username: "demo-viewer",
    email: "viewer@axiom-demo.com",
    displayName: "Demo Viewer",
    role: "board",
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [sarahCFO] = await db.insert(users).values({
    username: "schen",
    email: "sarah.chen@axiom-demo.com",
    displayName: "Sarah Chen",
    role: "owner",
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [marcusGC] = await db.insert(users).values({
    username: "mthompson",
    email: "marcus.thompson@axiom-demo.com",
    displayName: "Marcus Thompson",
    role: "contributor",
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [engineeringTeam] = await db.insert(teams).values({
    name: "Engineering",
    description: "Platform and infrastructure team",
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [financeTeam] = await db.insert(teams).values({
    name: "Finance",
    description: "Financial planning and analysis",
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [complianceTeam] = await db.insert(teams).values({
    name: "Compliance & Legal",
    description: "Regulatory compliance and legal affairs",
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [opsTeam] = await db.insert(teams).values({
    name: "Operations",
    description: "Business operations and logistics",
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  // ── Decision 1: Strategic ──
  const [d1] = await db.insert(decisions).values({
    title: "Migrate to Multi-Cloud Architecture",
    ownerId: demoAdmin.id,
    teamId: engineeringTeam.id,
    status: "published",
    debtScore: 35,
    reviewByDate: daysFromBase(90),
    publishedAt: daysFromBase(0),
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [v1] = await db.insert(decisionVersions).values({
    decisionId: d1.id,
    versionNumber: 1,
    title: "Migrate to Multi-Cloud Architecture",
    context: "Our current single-cloud infrastructure creates vendor lock-in risks and limits our ability to optimize costs across regions. We experienced two significant outages in the past year due to provider issues, each resulting in approximately $180K in lost revenue.",
    rationale: "A multi-cloud approach provides resilience, negotiating leverage, and the ability to use best-of-breed services from different providers. Analysis shows potential 20% cost reduction and 99.99% uptime achievable through redundancy.",
    outcome: "Implement multi-cloud architecture using AWS as primary and GCP as secondary provider by Q3 2026. Start with non-critical workloads and gradually migrate production systems over 6 months.",
    alternatives: "1. Stay with single cloud and negotiate better terms\n2. Move entirely to a different provider\n3. Build on-premise infrastructure for critical workloads",
    risks: "Increased operational complexity, potential for configuration drift between clouds, and higher initial implementation costs estimated at $320K.",
    authorId: demoAdmin.id,
    organizationId: DEFAULT_ORG_ID,
  }).returning();
  await db.update(decisions).set({ currentVersionId: v1.id }).where(eq(decisions.id, d1.id));

  await db.insert(assumptions).values([
    { decisionId: d1.id, description: "Cloud providers will maintain current pricing models through 2027", status: "valid", validUntil: daysFromBase(365), organizationId: DEFAULT_ORG_ID },
    { decisionId: d1.id, description: "Engineering team can acquire multi-cloud expertise within 6 months", status: "valid", validUntil: daysFromBase(180), organizationId: DEFAULT_ORG_ID },
    { decisionId: d1.id, description: "Kubernetes provides sufficient abstraction layer for workload portability", status: "valid", organizationId: DEFAULT_ORG_ID },
    { decisionId: d1.id, description: "Compliance requirements allow data residency in multiple cloud regions", status: "pending_review", organizationId: DEFAULT_ORG_ID },
  ]);

  // ── Decision 2: Operational ──
  const [d2] = await db.insert(decisions).values({
    title: "Consolidate EMEA Warehouse Operations",
    ownerId: sarahCFO.id,
    teamId: opsTeam.id,
    status: "published",
    debtScore: 48,
    reviewByDate: daysFromBase(60),
    publishedAt: daysFromBase(-30),
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [v2] = await db.insert(decisionVersions).values({
    decisionId: d2.id,
    versionNumber: 1,
    title: "Consolidate EMEA Warehouse Operations",
    context: "We currently operate four regional warehouses across EMEA with significant overlap in coverage areas. Utilization rates average 47% and shipping costs have increased 18% year-over-year due to inefficient routing.",
    rationale: "Consolidating to two strategically located hubs reduces fixed costs by $2.1M annually while improving average delivery times by 0.8 days through optimized logistics networks.",
    outcome: "Close Hamburg and Milan facilities by end of Q2 2026. Expand Rotterdam and Warsaw hubs to absorb volume. Retain 85% of affected staff through relocation packages.",
    alternatives: "1. Maintain all four facilities with efficiency improvements\n2. Outsource EMEA fulfillment to third-party logistics provider\n3. Close two facilities and open one new central hub",
    risks: "Temporary service disruptions during transition. Employee attrition above planned 15%. Lease termination penalties estimated at $450K.",
    authorId: sarahCFO.id,
    organizationId: DEFAULT_ORG_ID,
  }).returning();
  await db.update(decisions).set({ currentVersionId: v2.id }).where(eq(decisions.id, d2.id));

  await db.insert(assumptions).values([
    { decisionId: d2.id, description: "Rotterdam facility can handle 2.3x current throughput with planned expansion", status: "valid", validUntil: daysFromBase(120), organizationId: DEFAULT_ORG_ID },
    { decisionId: d2.id, description: "Lease termination for Hamburg and Milan will not exceed $500K combined", status: "pending_review", organizationId: DEFAULT_ORG_ID },
    { decisionId: d2.id, description: "At least 85% of affected staff will accept relocation packages", status: "valid", organizationId: DEFAULT_ORG_ID },
  ]);

  // ── Decision 3: Financial ──
  const [d3] = await db.insert(decisions).values({
    title: "Q1 2026 Budget Reallocation: Marketing to R&D",
    ownerId: sarahCFO.id,
    teamId: financeTeam.id,
    status: "published",
    debtScore: 42,
    reviewByDate: daysFromBase(55),
    publishedAt: daysFromBase(-15),
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [v3] = await db.insert(decisionVersions).values({
    decisionId: d3.id,
    versionNumber: 1,
    title: "Q1 2026 Budget Reallocation: Marketing to R&D",
    context: "Customer acquisition cost has increased 25% over the past two quarters while product-led growth channels show 3x better unit economics. Board has requested a revised capital allocation strategy.",
    rationale: "Redirecting $1.8M from paid acquisition to product development improves LTV:CAC ratio from 2.4:1 to projected 4.1:1. Product improvements drive organic growth and reduce dependency on paid channels.",
    outcome: "Reduce paid marketing budget by 30% and increase R&D allocation by equivalent amount. Prioritize retention features and self-serve onboarding. Measure impact over two quarters.",
    alternatives: "1. Maintain current allocation and accept lower unit economics\n2. Across-the-board 10% cuts to fund new initiatives\n3. Seek Series C bridge funding to maintain both budgets",
    risks: "Short-term revenue impact from reduced marketing spend. Pipeline may contract 15-20% in Q2 before product improvements compensate.",
    authorId: sarahCFO.id,
    organizationId: DEFAULT_ORG_ID,
  }).returning();
  await db.update(decisions).set({ currentVersionId: v3.id }).where(eq(decisions.id, d3.id));

  await db.insert(assumptions).values([
    { decisionId: d3.id, description: "Product-led growth channels will maintain current 3x efficiency advantage", status: "valid", validUntil: daysFromBase(180), organizationId: DEFAULT_ORG_ID },
    { decisionId: d3.id, description: "Existing customer base will not churn above 4% monthly during transition", status: "valid", organizationId: DEFAULT_ORG_ID },
    { decisionId: d3.id, description: "R&D team can deliver retention features within one quarter", status: "valid", validUntil: daysFromBase(90), organizationId: DEFAULT_ORG_ID },
  ]);

  // ── Decision 4: Compliance ──
  const [d4] = await db.insert(decisions).values({
    title: "Adopt SOC 2 Type II Certification Framework",
    ownerId: marcusGC.id,
    teamId: complianceTeam.id,
    status: "published",
    debtScore: 22,
    reviewByDate: daysFromBase(120),
    publishedAt: daysFromBase(-45),
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [v4] = await db.insert(decisionVersions).values({
    decisionId: d4.id,
    versionNumber: 1,
    title: "Adopt SOC 2 Type II Certification Framework",
    context: "Three enterprise prospects in the past quarter have required SOC 2 Type II as a procurement prerequisite. Our current security posture meets most requirements but lacks formal certification and continuous monitoring documentation.",
    rationale: "SOC 2 Type II certification unlocks the enterprise sales segment (estimated $4.2M pipeline) and demonstrates security maturity to existing customers. The certification process also strengthens our actual security posture.",
    outcome: "Engage external auditor for 12-month observation period. Implement continuous monitoring controls. Target certification by Q4 2026. Estimated cost: $185K including tooling and audit fees.",
    alternatives: "1. Pursue SOC 2 Type I first as a stepping stone\n2. Offer individual security assessments per enterprise prospect\n3. Target ISO 27001 instead of SOC 2",
    risks: "Audit findings may require unplanned engineering work. Staff time commitment is significant during observation period.",
    authorId: marcusGC.id,
    organizationId: DEFAULT_ORG_ID,
  }).returning();
  await db.update(decisions).set({ currentVersionId: v4.id }).where(eq(decisions.id, d4.id));

  await db.insert(assumptions).values([
    { decisionId: d4.id, description: "External auditor availability within 60 days of engagement", status: "valid", validUntil: daysFromBase(60), organizationId: DEFAULT_ORG_ID },
    { decisionId: d4.id, description: "Engineering can implement required controls without a dedicated security hire", status: "pending_review", organizationId: DEFAULT_ORG_ID },
    { decisionId: d4.id, description: "Enterprise prospects will wait for certification rather than choosing competitors", status: "valid", organizationId: DEFAULT_ORG_ID },
  ]);

  // ── Decision 5: Strategic (high debt) ──
  const [d5] = await db.insert(decisions).values({
    title: "Strategic Investment in AI/ML Platform Capabilities",
    ownerId: demoAdmin.id,
    teamId: engineeringTeam.id,
    status: "published",
    debtScore: 78,
    reviewByDate: daysFromBase(15),
    publishedAt: daysFromBase(-120),
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [v5] = await db.insert(decisionVersions).values({
    decisionId: d5.id,
    versionNumber: 1,
    title: "Strategic Investment in AI/ML Platform Capabilities",
    context: "Competitors have shipped AI-powered features in the past 6 months. Customer feedback indicates growing expectation for intelligent automation. The market window for differentiation is narrowing.",
    rationale: "Building core AI capabilities in-house provides defensible competitive advantage. Build-vs-buy analysis shows 40% lower 3-year TCO for in-house development with greater customization potential.",
    outcome: "Invest $5M in AI/ML team and infrastructure. Deliver 3 AI-powered product features by Q2 2026. Establish AI ethics review board for governance.",
    alternatives: "1. Partner with AI vendors for specific features\n2. Acquire an AI startup for team and technology\n3. Wait for market to mature and adopt commoditized solutions",
    risks: "High upfront investment with uncertain ROI timeline. Talent competition in AI market is intense. Regulatory landscape around AI use is evolving rapidly.",
    authorId: demoAdmin.id,
    organizationId: DEFAULT_ORG_ID,
  }).returning();
  await db.update(decisions).set({ currentVersionId: v5.id }).where(eq(decisions.id, d5.id));

  await db.insert(assumptions).values([
    { decisionId: d5.id, description: "AI talent market will remain accessible at current compensation levels", status: "expired", organizationId: DEFAULT_ORG_ID },
    { decisionId: d5.id, description: "Open source AI models will continue advancing at current pace", status: "valid", organizationId: DEFAULT_ORG_ID },
    { decisionId: d5.id, description: "Regulatory environment remains favorable for AI deployment in our sector", status: "pending_review", organizationId: DEFAULT_ORG_ID },
    { decisionId: d5.id, description: "Customer data usage rights are sufficient for model training", status: "pending_review", organizationId: DEFAULT_ORG_ID },
  ]);

  // ── Decision 6: Operational ──
  const [d6] = await db.insert(decisions).values({
    title: "Implement Zero-Trust Network Architecture",
    ownerId: demoAdmin.id,
    teamId: engineeringTeam.id,
    status: "published",
    debtScore: 31,
    reviewByDate: daysFromBase(100),
    publishedAt: daysFromBase(-20),
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [v6] = await db.insert(decisionVersions).values({
    decisionId: d6.id,
    versionNumber: 1,
    title: "Implement Zero-Trust Network Architecture",
    context: "Recent industry breaches have exposed vulnerabilities in traditional perimeter-based security. Our insurance provider has increased premiums 22% and requires enhanced network segmentation by renewal.",
    rationale: "Zero-trust architecture eliminates implicit trust assumptions, reduces lateral movement risk, and satisfies insurance and compliance requirements. Implementation aligns with our SOC 2 certification timeline.",
    outcome: "Deploy identity-based access controls across all internal services within 9 months. Replace VPN with zero-trust network access. Implement continuous verification for all service-to-service communication.",
    alternatives: "1. Enhance existing perimeter security with additional monitoring\n2. Implement micro-segmentation only for critical systems\n3. Outsource network security to managed security provider",
    risks: "Temporary productivity impact during transition. Legacy systems may require significant refactoring. Total cost estimated at $280K.",
    authorId: demoAdmin.id,
    organizationId: DEFAULT_ORG_ID,
  }).returning();
  await db.update(decisions).set({ currentVersionId: v6.id }).where(eq(decisions.id, d6.id));

  await db.insert(assumptions).values([
    { decisionId: d6.id, description: "All internal services can support token-based authentication within timeline", status: "valid", validUntil: daysFromBase(270), organizationId: DEFAULT_ORG_ID },
    { decisionId: d6.id, description: "Insurance provider will reduce premiums after implementation (projected 15% reduction)", status: "valid", organizationId: DEFAULT_ORG_ID },
    { decisionId: d6.id, description: "Zero-trust tooling market is mature enough for production deployment", status: "valid", organizationId: DEFAULT_ORG_ID },
  ]);

  // ── Decision 7: Financial/Strategic ──
  const [d7] = await db.insert(decisions).values({
    title: "Series B Extension: Terms and Allocation",
    ownerId: sarahCFO.id,
    teamId: financeTeam.id,
    status: "published",
    debtScore: 55,
    reviewByDate: daysFromBase(30),
    publishedAt: daysFromBase(-60),
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [v7] = await db.insert(decisionVersions).values({
    decisionId: d7.id,
    versionNumber: 1,
    title: "Series B Extension: Terms and Allocation",
    context: "Current runway is 14 months at projected burn rate. Market conditions for fundraising have tightened. Our lead investor has offered a $12M extension at a 15% discount to last round valuation.",
    rationale: "Accepting the extension provides 22-month runway, sufficient to reach profitability milestones. The valuation discount is acceptable given market conditions — comparable companies have accepted 20-30% markdowns.",
    outcome: "Accept $12M Series B extension. Allocate 40% to product development, 35% to sales, 25% to operations. Implement monthly burn rate reporting to board.",
    alternatives: "1. Pursue full Series C at higher target valuation (6-9 month process)\n2. Cut burn rate 30% to extend runway without new capital\n3. Explore strategic acquisition offers",
    risks: "Dilution impact on existing shareholders. Down-round optics may affect hiring and partnerships. Board seat dynamics change with increased investor allocation.",
    authorId: sarahCFO.id,
    organizationId: DEFAULT_ORG_ID,
  }).returning();
  await db.update(decisions).set({ currentVersionId: v7.id }).where(eq(decisions.id, d7.id));

  await db.insert(assumptions).values([
    { decisionId: d7.id, description: "Revenue growth will reach 15% MoM within 6 months post-funding", status: "valid", validUntil: daysFromBase(180), organizationId: DEFAULT_ORG_ID },
    { decisionId: d7.id, description: "No material adverse change in market conditions before close", status: "pending_review", organizationId: DEFAULT_ORG_ID },
    { decisionId: d7.id, description: "Key hires can be made within 90 days of funding", status: "valid", validUntil: daysFromBase(90), organizationId: DEFAULT_ORG_ID },
  ]);

  // ── Evidence Links ──
  await db.insert(evidenceLinks).values([
    { decisionId: d1.id, title: "Cloud Cost Analysis Report", url: "https://internal.axiom.com/docs/cloud-cost-analysis-2025", description: "Detailed cost comparison between AWS, GCP, and Azure across workload types", organizationId: DEFAULT_ORG_ID },
    { decisionId: d1.id, title: "Gartner Multi-Cloud Strategy Guide", url: "https://gartner.com/multicloud-strategy-2025", description: "Industry analysis of multi-cloud adoption trends and best practices", organizationId: DEFAULT_ORG_ID },
    { decisionId: d2.id, title: "EMEA Logistics Network Analysis", url: "https://internal.axiom.com/docs/emea-logistics-q4", description: "Coverage overlap analysis and hub optimization modeling", organizationId: DEFAULT_ORG_ID },
    { decisionId: d3.id, title: "Unit Economics Dashboard", url: "https://internal.axiom.com/analytics/unit-economics", description: "LTV:CAC analysis by acquisition channel", organizationId: DEFAULT_ORG_ID },
    { decisionId: d4.id, title: "SOC 2 Readiness Assessment", url: "https://internal.axiom.com/docs/soc2-gap-analysis", description: "Gap analysis report from external security consultant", organizationId: DEFAULT_ORG_ID },
    { decisionId: d5.id, title: "AI Investment Business Case", url: "https://internal.axiom.com/docs/ai-business-case", description: "ROI projections and competitive analysis for AI capabilities", organizationId: DEFAULT_ORG_ID },
    { decisionId: d7.id, title: "Series B Extension Term Sheet", url: "https://internal.axiom.com/docs/series-b-terms", description: "Proposed terms and allocation breakdown", organizationId: DEFAULT_ORG_ID },
  ]);

  // ── Alerts ──
  await db.insert(alerts).values([
    {
      decisionId: d5.id,
      type: "assumption_expired",
      severity: "critical",
      message: "AI talent market assumption has expired. Compensation benchmarks have shifted 30% above projections. Review hiring strategy and budget allocation.",
      metadata: { assumptionIndex: 0 },
      organizationId: DEFAULT_ORG_ID,
    },
    {
      decisionId: d7.id,
      type: "review_overdue",
      severity: "high",
      message: "Series B Extension decision review is approaching deadline. Market conditions assumption requires urgent validation before board meeting.",
      metadata: {},
      organizationId: DEFAULT_ORG_ID,
    },
    {
      decisionId: d5.id,
      type: "high_debt_score",
      severity: "high",
      message: "Decision debt score exceeds threshold (78). Multiple assumptions require review including regulatory and customer data usage.",
      metadata: { score: 78 },
      organizationId: DEFAULT_ORG_ID,
    },
    {
      decisionId: d1.id,
      type: "review_overdue",
      severity: "medium",
      message: "Multi-cloud compliance assumption is pending review. Verify data residency requirements across target regions before proceeding with GCP migration.",
      metadata: {},
      organizationId: DEFAULT_ORG_ID,
    },
  ]);

  // ── Audit Trail (immutable entries) ──
  await db.insert(auditLogs).values([
    { organizationId: DEFAULT_ORG_ID, userId: demoAdmin.id, action: "created", entityType: "decision", entityId: d1.id, details: { title: "Migrate to Multi-Cloud Architecture" }, createdAt: daysFromBase(0) },
    { organizationId: DEFAULT_ORG_ID, userId: demoAdmin.id, action: "reviewed", entityType: "decision", entityId: d1.id, details: { outcome: "Approved with conditions" }, createdAt: daysFromBase(2) },
    { organizationId: DEFAULT_ORG_ID, userId: sarahCFO.id, action: "approved", entityType: "decision", entityId: d1.id, details: { approver: "Sarah Chen, CFO" }, createdAt: daysFromBase(3) },
    { organizationId: DEFAULT_ORG_ID, userId: demoAdmin.id, action: "logged", entityType: "decision", entityId: d1.id, details: { note: "Decision published to organization record" }, createdAt: daysFromBase(3) },
    { organizationId: DEFAULT_ORG_ID, userId: sarahCFO.id, action: "created", entityType: "decision", entityId: d2.id, details: { title: "Consolidate EMEA Warehouse Operations" }, createdAt: daysFromBase(-30) },
    { organizationId: DEFAULT_ORG_ID, userId: marcusGC.id, action: "reviewed", entityType: "decision", entityId: d2.id, details: { outcome: "Legal review complete" }, createdAt: daysFromBase(-28) },
    { organizationId: DEFAULT_ORG_ID, userId: demoAdmin.id, action: "approved", entityType: "decision", entityId: d2.id, details: { approver: "Demo Admin" }, createdAt: daysFromBase(-27) },
    { organizationId: DEFAULT_ORG_ID, userId: sarahCFO.id, action: "logged", entityType: "decision", entityId: d2.id, details: { note: "Decision published to organization record" }, createdAt: daysFromBase(-27) },
    { organizationId: DEFAULT_ORG_ID, userId: sarahCFO.id, action: "created", entityType: "decision", entityId: d3.id, details: { title: "Q1 2026 Budget Reallocation" }, createdAt: daysFromBase(-15) },
    { organizationId: DEFAULT_ORG_ID, userId: demoAdmin.id, action: "approved", entityType: "decision", entityId: d3.id, details: { approver: "Demo Admin" }, createdAt: daysFromBase(-13) },
    { organizationId: DEFAULT_ORG_ID, userId: marcusGC.id, action: "created", entityType: "decision", entityId: d4.id, details: { title: "Adopt SOC 2 Type II Certification Framework" }, createdAt: daysFromBase(-45) },
    { organizationId: DEFAULT_ORG_ID, userId: demoAdmin.id, action: "reviewed", entityType: "decision", entityId: d4.id, details: { outcome: "Approved — aligns with enterprise sales strategy" }, createdAt: daysFromBase(-43) },
    { organizationId: DEFAULT_ORG_ID, userId: demoAdmin.id, action: "created", entityType: "decision", entityId: d5.id, details: { title: "Strategic Investment in AI/ML Platform Capabilities" }, createdAt: daysFromBase(-120) },
    { organizationId: DEFAULT_ORG_ID, userId: sarahCFO.id, action: "reviewed", entityType: "decision", entityId: d5.id, details: { outcome: "Budget approved with quarterly review gates" }, createdAt: daysFromBase(-118) },
    { organizationId: DEFAULT_ORG_ID, userId: demoAdmin.id, action: "approved", entityType: "decision", entityId: d5.id, details: { approver: "Demo Admin" }, createdAt: daysFromBase(-117) },
    { organizationId: DEFAULT_ORG_ID, userId: demoAdmin.id, action: "logged", entityType: "decision", entityId: d5.id, details: { note: "Assumption expired: AI talent market compensation" }, createdAt: daysFromBase(-30) },
    { organizationId: DEFAULT_ORG_ID, userId: demoAdmin.id, action: "created", entityType: "decision", entityId: d6.id, details: { title: "Implement Zero-Trust Network Architecture" }, createdAt: daysFromBase(-20) },
    { organizationId: DEFAULT_ORG_ID, userId: marcusGC.id, action: "reviewed", entityType: "decision", entityId: d6.id, details: { outcome: "Compliance review passed" }, createdAt: daysFromBase(-18) },
    { organizationId: DEFAULT_ORG_ID, userId: sarahCFO.id, action: "created", entityType: "decision", entityId: d7.id, details: { title: "Series B Extension: Terms and Allocation" }, createdAt: daysFromBase(-60) },
    { organizationId: DEFAULT_ORG_ID, userId: demoAdmin.id, action: "reviewed", entityType: "decision", entityId: d7.id, details: { outcome: "Terms reviewed — discount acceptable given market" }, createdAt: daysFromBase(-58) },
    { organizationId: DEFAULT_ORG_ID, userId: demoViewer.id, action: "approved", entityType: "decision", entityId: d7.id, details: { approver: "Board review complete" }, createdAt: daysFromBase(-56) },
  ]);

  console.log("Database seeded successfully!");
  });
}
