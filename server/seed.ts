import { getDb, withOrgContext } from "./rls";
import { 
  users, 
  teams, 
  decisions, 
  decisionVersions, 
  assumptions, 
  alerts,
  evidenceLinks
} from "@shared/schema";
import { eq } from "drizzle-orm";

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export async function seedDatabase() {
  console.log("Checking if database needs seeding...");

  return withOrgContext(DEFAULT_ORG_ID, async () => {
    const db = getDb();
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      console.log("Database already has data, skipping seed.");
      return;
    }

  console.log("Seeding database with initial data...");

  const [adminUser] = await db.insert(users).values({
    username: "jdoe",
    email: "john.doe@axiom.com",
    displayName: "John Doe",
    role: "admin",
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [ownerUser] = await db.insert(users).values({
    username: "ssmith",
    email: "sarah.smith@axiom.com",
    displayName: "Sarah Smith",
    role: "owner",
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [contributorUser] = await db.insert(users).values({
    username: "mwilliams",
    email: "michael.williams@axiom.com",
    displayName: "Michael Williams",
    role: "contributor",
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [boardUser] = await db.insert(users).values({
    username: "ejohnson",
    email: "emily.johnson@axiom.com",
    displayName: "Emily Johnson",
    role: "board",
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [engineeringTeam] = await db.insert(teams).values({
    name: "Engineering",
    description: "Platform and infrastructure team",
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [productTeam] = await db.insert(teams).values({
    name: "Product",
    description: "Product strategy and development",
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [financeTeam] = await db.insert(teams).values({
    name: "Finance",
    description: "Financial planning and analysis",
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const reviewDate1 = new Date();
  reviewDate1.setDate(reviewDate1.getDate() + 45);

  const [decision1] = await db.insert(decisions).values({
    title: "Migrate to Multi-Cloud Architecture",
    ownerId: adminUser.id,
    teamId: engineeringTeam.id,
    status: "published",
    debtScore: 35,
    reviewByDate: reviewDate1,
    publishedAt: new Date(),
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [version1] = await db.insert(decisionVersions).values({
    decisionId: decision1.id,
    versionNumber: 1,
    title: "Migrate to Multi-Cloud Architecture",
    context: "Our current single-cloud infrastructure creates vendor lock-in risks and limits our ability to optimize costs across regions. We've experienced two significant outages in the past year due to provider issues.",
    rationale: "A multi-cloud approach provides resilience, negotiating leverage, and the ability to use best-of-breed services from different providers. Analysis shows potential 20% cost reduction.",
    outcome: "Implement multi-cloud architecture using AWS as primary and GCP as secondary provider by Q3 2025. Start with non-critical workloads and gradually migrate production systems.",
    alternatives: "1. Stay with single cloud and negotiate better terms\n2. Move entirely to a different provider\n3. Build on-premise infrastructure",
    risks: "Increased operational complexity, potential for configuration drift between clouds, and higher initial implementation costs.",
    authorId: adminUser.id,
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  await db.update(decisions).set({ currentVersionId: version1.id }).where(eq(decisions.id, decision1.id));

  await db.insert(assumptions).values([
    { decisionId: decision1.id, description: "Cloud providers will maintain current pricing models", status: "valid", validUntil: reviewDate1, organizationId: DEFAULT_ORG_ID },
    { decisionId: decision1.id, description: "Team can acquire multi-cloud expertise within 6 months", status: "valid", validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), organizationId: DEFAULT_ORG_ID },
    { decisionId: decision1.id, description: "Kubernetes provides sufficient abstraction layer", status: "valid", organizationId: DEFAULT_ORG_ID },
    { decisionId: decision1.id, description: "Compliance requirements allow data in multiple clouds", status: "pending_review", organizationId: DEFAULT_ORG_ID },
  ]);

  const reviewDate2 = new Date();
  reviewDate2.setDate(reviewDate2.getDate() + 20);

  const [decision2] = await db.insert(decisions).values({
    title: "Adopt Microservices Architecture",
    ownerId: ownerUser.id,
    teamId: engineeringTeam.id,
    status: "published",
    debtScore: 62,
    reviewByDate: reviewDate2,
    publishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [version2] = await db.insert(decisionVersions).values({
    decisionId: decision2.id,
    versionNumber: 1,
    title: "Adopt Microservices Architecture",
    context: "Our monolithic application is becoming difficult to scale and deploy. Development velocity has decreased 40% over the past year due to merge conflicts and tightly coupled code.",
    rationale: "Microservices allow independent deployment, technology diversity, and better team autonomy. Industry best practices and our growth trajectory support this transition.",
    outcome: "Decompose the monolith into domain-driven microservices over 18 months. Start with authentication and billing as pilot services.",
    alternatives: "1. Modularize the monolith without full decomposition\n2. Rewrite in a new framework\n3. Maintain status quo with more developers",
    risks: "Distributed systems complexity, potential for inconsistent data, and need for significant DevOps investment.",
    authorId: ownerUser.id,
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  await db.update(decisions).set({ currentVersionId: version2.id }).where(eq(decisions.id, decision2.id));

  await db.insert(assumptions).values([
    { decisionId: decision2.id, description: "Team size will grow to support distributed architecture", status: "pending_review", organizationId: DEFAULT_ORG_ID },
    { decisionId: decision2.id, description: "Service mesh technology will mature within our timeline", status: "valid", organizationId: DEFAULT_ORG_ID },
    { decisionId: decision2.id, description: "Data consistency challenges are manageable with eventual consistency", status: "valid", organizationId: DEFAULT_ORG_ID },
  ]);

  const reviewDate3 = new Date();
  reviewDate3.setDate(reviewDate3.getDate() + 75);

  const [decision3] = await db.insert(decisions).values({
    title: "Implement Permanent Hybrid Work Model",
    ownerId: contributorUser.id,
    teamId: productTeam.id,
    status: "published",
    debtScore: 28,
    reviewByDate: reviewDate3,
    publishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [version3] = await db.insert(decisionVersions).values({
    decisionId: decision3.id,
    versionNumber: 1,
    title: "Implement Permanent Hybrid Work Model",
    context: "Post-pandemic work patterns have stabilized. Employee surveys show 78% preference for hybrid work. Competitor analysis shows hybrid as the emerging standard.",
    rationale: "Hybrid work improves employee satisfaction and retention while maintaining collaboration benefits. Office space costs can be reduced by 30%.",
    outcome: "Adopt 3-days-office, 2-days-remote policy as the default. Provide home office stipends and upgrade video conferencing infrastructure.",
    alternatives: "1. Return to full in-office\n2. Go fully remote\n3. Flexible per-team policies",
    risks: "Potential culture fragmentation, coordination challenges, and possible inequity between remote and in-office employees.",
    authorId: contributorUser.id,
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  await db.update(decisions).set({ currentVersionId: version3.id }).where(eq(decisions.id, decision3.id));

  await db.insert(assumptions).values([
    { decisionId: decision3.id, description: "Real estate market allows flexible lease terms", status: "valid", organizationId: DEFAULT_ORG_ID },
    { decisionId: decision3.id, description: "Productivity remains stable with hybrid model", status: "valid", organizationId: DEFAULT_ORG_ID },
    { decisionId: decision3.id, description: "Collaboration tools will continue to improve", status: "valid", organizationId: DEFAULT_ORG_ID },
  ]);

  const reviewDate4 = new Date();
  reviewDate4.setDate(reviewDate4.getDate() + 15);

  const [decision4] = await db.insert(decisions).values({
    title: "Strategic Investment in AI/ML Capabilities",
    ownerId: adminUser.id,
    teamId: productTeam.id,
    status: "published",
    debtScore: 78,
    reviewByDate: reviewDate4,
    publishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [version4] = await db.insert(decisionVersions).values({
    decisionId: decision4.id,
    versionNumber: 1,
    title: "Strategic Investment in AI/ML Capabilities",
    context: "AI is transforming our industry. Competitors are shipping AI-powered features. Customer expectations are rapidly evolving.",
    rationale: "First-mover advantage in AI features could define market position for the next decade. Build vs buy analysis favors building core AI capabilities in-house.",
    outcome: "Invest $5M in AI/ML team and infrastructure. Target 3 AI-powered product features by Q2 2025. Establish AI ethics review board.",
    alternatives: "1. Partner with AI vendors for specific features\n2. Acquire AI startup\n3. Wait for technology to mature",
    risks: "High upfront investment, talent competition, and rapid technology obsolescence. Regulatory uncertainty around AI use.",
    authorId: adminUser.id,
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  await db.update(decisions).set({ currentVersionId: version4.id }).where(eq(decisions.id, decision4.id));

  await db.insert(assumptions).values([
    { decisionId: decision4.id, description: "AI talent market will remain accessible at current compensation levels", status: "expired", organizationId: DEFAULT_ORG_ID },
    { decisionId: decision4.id, description: "Open source AI models will continue advancing", status: "valid", organizationId: DEFAULT_ORG_ID },
    { decisionId: decision4.id, description: "Regulatory environment remains favorable", status: "pending_review", organizationId: DEFAULT_ORG_ID },
    { decisionId: decision4.id, description: "Customer data can be used for AI training", status: "pending_review", organizationId: DEFAULT_ORG_ID },
  ]);

  const [decision5] = await db.insert(decisions).values({
    title: "Q1 2025 Budget Reallocation",
    ownerId: ownerUser.id,
    teamId: financeTeam.id,
    status: "published",
    debtScore: 45,
    reviewByDate: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
    publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  const [version5] = await db.insert(decisionVersions).values({
    decisionId: decision5.id,
    versionNumber: 1,
    title: "Q1 2025 Budget Reallocation",
    context: "Market conditions have shifted significantly. Customer acquisition costs have increased 25%. Need to optimize spend allocation.",
    rationale: "Reallocating from paid marketing to product development will improve unit economics and create more sustainable growth.",
    outcome: "Reduce paid marketing budget by 30% and increase R&D allocation by equivalent amount. Focus on retention over acquisition.",
    alternatives: "1. Maintain current allocation\n2. Across-the-board cuts\n3. Seek additional funding",
    risks: "Short-term revenue impact from reduced marketing. Team capacity constraints for additional development.",
    authorId: ownerUser.id,
    organizationId: DEFAULT_ORG_ID,
  }).returning();

  await db.update(decisions).set({ currentVersionId: version5.id }).where(eq(decisions.id, decision5.id));

  await db.insert(assumptions).values([
    { decisionId: decision5.id, description: "Market conditions will stabilize within 6 months", status: "valid", organizationId: DEFAULT_ORG_ID },
    { decisionId: decision5.id, description: "Product improvements will drive organic growth", status: "valid", organizationId: DEFAULT_ORG_ID },
    { decisionId: decision5.id, description: "Existing customer base will not churn significantly", status: "valid", organizationId: DEFAULT_ORG_ID },
  ]);

  await db.insert(evidenceLinks).values([
    { decisionId: decision1.id, title: "Cloud Cost Analysis Report", url: "https://internal.axiom.com/docs/cloud-analysis-2024", description: "Detailed cost comparison between cloud providers", organizationId: DEFAULT_ORG_ID },
    { decisionId: decision1.id, title: "Gartner Multi-Cloud Report", url: "https://gartner.com/multicloud-2024", description: "Industry analysis of multi-cloud adoption trends", organizationId: DEFAULT_ORG_ID },
    { decisionId: decision2.id, title: "Microservices Migration Guide", url: "https://internal.axiom.com/docs/microservices-guide", description: "Internal documentation for microservices transition", organizationId: DEFAULT_ORG_ID },
    { decisionId: decision4.id, title: "AI Investment Business Case", url: "https://internal.axiom.com/docs/ai-business-case", description: "ROI analysis for AI capabilities investment", organizationId: DEFAULT_ORG_ID },
  ]);

  await db.insert(alerts).values([
    { 
      decisionId: decision4.id, 
      type: "assumption_expired", 
      severity: "critical", 
      message: "AI talent market assumption has expired. Review compensation benchmarks and hiring strategy.",
      metadata: { assumptionIndex: 0 },
      organizationId: DEFAULT_ORG_ID,
    },
    { 
      decisionId: decision2.id, 
      type: "review_overdue", 
      severity: "high", 
      message: "Decision review date is approaching. Team growth assumption requires validation.",
      metadata: {},
      organizationId: DEFAULT_ORG_ID,
    },
    { 
      decisionId: decision4.id, 
      type: "high_debt_score", 
      severity: "high", 
      message: "Decision debt score exceeds threshold (78). Multiple assumptions require review.",
      metadata: { score: 78 },
      organizationId: DEFAULT_ORG_ID,
    },
    { 
      decisionId: decision1.id, 
      type: "review_overdue", 
      severity: "medium", 
      message: "Compliance assumption pending review. Verify multi-cloud data residency requirements.",
      metadata: {},
      organizationId: DEFAULT_ORG_ID,
    },
  ]);

  console.log("Database seeded successfully!");
  });
}
