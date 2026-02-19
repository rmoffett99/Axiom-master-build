# AXIOM™ - Enterprise Decision Intelligence Platform

## Overview
AXIOM™ is a system of record for how decisions are made in an organization. It captures why decisions were made, what assumptions justified them, who owns them, and when they must be reviewed. The platform continuously detects decision risk ("Decision Debt™") when assumptions expire, owners leave, time passes without review, or decisions contradict each other.

## Core Principles
- **Append-Only**: Decisions are never deleted or silently edited. All changes create new versions.
- **Accountability**: Every decision has ONE accountable owner (human).
- **Auditability**: Complete audit trail for all actions.
- **Institutional Memory**: Leadership turnover must not break context.

## Tech Stack
- **Frontend**: React with TypeScript, Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: TanStack React Query

## Data Model

### Core Entities
- **Users**: Platform users with roles (admin, owner, contributor, viewer, board)
- **Teams**: Organizational teams
- **Decisions**: Main decision records with owner assignment
- **DecisionVersions**: Append-only version history (immutable)
- **Assumptions**: Key assumptions that must remain true for decisions to be valid
- **Alerts**: Risk notifications (assumption expired, owner departed, review overdue, etc.)
- **AuditLogs**: Complete action trail

## API Routes

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Decisions
- `GET /api/decisions` - List all decisions
- `GET /api/decisions/:id` - Get decision details with versions, assumptions, alerts
- `POST /api/decisions` - Create new decision (requires minimum 3 assumptions)
- `POST /api/decisions/:id/amend` - Create new version (append-only amendment)

### Assumptions
- `PATCH /api/assumptions/:id` - Update assumption status

### Alerts
- `GET /api/alerts` - List all alerts
- `POST /api/alerts/:id/acknowledge` - Acknowledge an alert

### Users & Teams
- `GET /api/users` - List all users
- `GET /api/teams` - List all teams

## Pages

### Landing Page (`/`)
Marketing landing page with hero, problem, solution, and features sections.

### Dashboard (`/dashboard`)
Organization Decision Health Overview with:
- Total decisions, average debt score, critical alerts, expiring soon stats
- Decision Debt trend chart
- Top risky decisions list
- Expiring decisions (30/60/90 days)

### Decisions List (`/decisions`)
Table view of all decisions with:
- Search and filter by status
- Create new decision CTA

### Decision Detail (`/decisions/:id`)
Detailed view with tabs:
- Overview (context, rationale, outcome, alternatives, risks)
- Assumptions (with validate/invalidate actions)
- Evidence links
- Version history
- Alerts

### New Decision (`/decisions/new`)
Multi-step guided form:
1. Basic Info (title, owner, team, review date)
2. Context & Rationale
3. Assumptions (minimum 3 required)
4. Review & Publish

### Alerts (`/alerts`)
Alert management with:
- Severity filter (critical, high, medium, low)
- Pending vs acknowledged tabs
- Manual acknowledge only

### Board Mode (`/board`)
Read-only executive view with:
- Key metrics summary
- Decision Debt trend chart
- Top 10 highest risk decisions
- Decisions requiring review
- Export report functionality

## Development

### Running Locally
```bash
npm run dev
```

### Database
```bash
npm run db:push  # Push schema changes
```

## Hardening Rules (EXECUTION MODE)
- Application is frozen for demos — only bug fixes allowed, no new features or copy changes
- All scores must be deterministic (no Math.random or volatile calculations)
- Conservative language for financial reviewers — "System-generated" not "AI-detected"
- Landing page retains marketing positioning ("AI-ready decision intelligence"); in-app copy is conservative
- Footer copyright: © 2026 Axiom Systems
- If something is not fully reliable, hide it rather than approximate it
- Priority: reviewer trust over feature completeness

## Future: Company Brain Schema
- Reference schema stored at: `attached_assets/Pasted--Company-Brain-schema-Postgres-Goal-store-institutional_1770643861922.txt`
- Covers: institutional memory, principles/policy layer, context snapshots, reasoning traces, action plans, and full audit trail
- Significantly expands current AXIOM data model (org tenancy, memory items, signals, decision evidence, rules engine)
- Status: Planning document only — not implemented, no current app changes

## Recent Changes
- 2026-02-19: Company Brain V1-V8 Master Work Order — Full Enterprise Implementation
  - V1 Core Lock: brain_decision table with 17 fields (domain, subject_type, triggered_by, model_version, confidence_score, alignment_score + version/formula/computed_at, outcome, status, snapshot_hash, decision_hash, decision_fingerprint UNIQUE)
  - V1 Satellite tables: decision_input_snapshot, principles_applied, override_history, assumption_validation_history, drift_metrics
  - V1 Enhanced decision_rule_hit: added rule_version, severity, outcome, evaluated_at columns
  - Write-time integrity: SHA256 hashing for snapshot_hash, decision_hash, decision_fingerprint — all computed at INSERT only, never recomputed
  - Alignment score: deterministic formula (rule_hits*15 + avg_principle_priority*0.6 + override_bonus + validated_assumptions*5), stored with version + formula version + computed_at, immutable
  - V3 Super Audit: audit_access_log (user_id, decision_id, ip_address), audit_export_log (export_type, export_purpose REQUIRED, bundle_hash, export_file_size)
  - V4 Immutability: DB triggers blocking UPDATE/DELETE on 15 audit tables (brain_decision, decision_input_snapshot, decision_rule_hit, principles_applied, override_history, assumption_validation_history, drift_metrics, audit_access_log, audit_export_log, replay_mismatch_alerts, decision_log, decision_reasoning, decision_audit, action_approval, action_execution)
  - V5 Replay Engine: deterministic replay loads snapshot + rule hits + principles, recomputes alignment_score, compares outcome; replay_mismatch_alerts table with severity (LOW/MEDIUM/CRITICAL); CRITICAL on outcome mismatch
  - V6 Performance: 14 indexes on brain tables (decision_id, created_at, domain, rule_id, principle_id, fingerprint)
  - V7 Security: Rate limiting on export endpoint (10/min), Zod validation on all inputs, no raw SQL interpolation
  - UTC enforcement: All brain table timestamps use TIMESTAMPTZ
  - New files: server/brainIntegrity.ts (SHA256, alignment scoring, bundle hashing), server/replayEngine.ts (deterministic replay)
  - New API routes: POST /api/brain/replay/:id, POST /api/brain/access-log, POST /api/brain/export, POST /api/brain/override, POST /api/brain/assumption-validation
  - No UI changes, no demo behavior changes — backend infrastructure only
  - Master work order: attached_assets/Pasted-AXIOM-COMPANY-BRAIN-MASTER-IMPLEMENTATION-WORK-ORDER-FI_1771512188221.txt
  - Verification work order: attached_assets/Pasted-AXIOM-AGENT-VERIFICATION-REMEDIATION-WORK-ORDER-Purpose_1771512698116.txt
- 2026-02-19: Company Brain v3 — controlled actions + approvals
  - Added 5 new tables: action, action_proposal, action_approval, action_execution, automation_settings
  - action: registry of action types (send_email, block_payment, etc.) with reversible flag
  - action_proposal: generated when rule outcome = require_review or block; status lifecycle: pending → approved/rejected → executed/expired
  - action_approval: human sign-off records with role-based validation
  - action_execution: execution results with kill switch check
  - automation_settings: global kill switch (enabled/disabled with reason + actor)
  - Created server/actionProposals.ts: proposeActionsForRuleHits, approveActionProposal, executeApprovedAction
  - proposeActionsForRuleHits chained at end of runRules — fire-and-forget, fail-silent
  - New API routes under /api/brain/*: GET proposals, POST approve, POST execute, GET/PATCH automation settings
  - No UI changes, no behavior changes to existing demo — backend infrastructure only
  - Master work order stored at: attached_assets/Pasted-AXIOM-COMPANY-BRAIN-MASTER-IMPLEMENTATION-WORK-ORDER-FI_1771512188221.txt
- 2026-02-09: Company Brain v2 — principles, rules engine, rule hits
  - Added 3 new tables: principle, rule, decision_rule_hit (all uuid PKs, defaultRandom())
  - principle: org-scoped guiding statements with priority and domain
  - rule: conditional expressions evaluated against decision metadata (conditionExpr + outcome)
  - decision_rule_hit: records each rule evaluation result (hit boolean + hitDetails jsonb)
  - Created server/runRules.ts: queries active rules by domain, evaluates conditionExpr via Function(), inserts hits
  - Wired runRules() at all 5 existing logDecision choke points via .then() — fire-and-forget, fail-silent
  - No UI changes, no behavior changes, no new routes — passive rules layer only
- 2026-02-09: Company Brain v1 schema replaced with refined design
  - Replaced brain_decision_log/brain_reasoning_summary/brain_audit_trail with decision_log/decision_reasoning/decision_audit
  - New tables use uuid PKs, proper FK relationships (reasoning + audit reference decision_log)
  - decision_log: decision_type, source_module, subject_type, subject_id, metadata (jsonb)
  - decision_reasoning: FK to decision_log, summary_text, confidence_score
  - decision_audit: FK to decision_log, event_type, actor, snapshot (jsonb)
  - brain-recorder.ts rewritten: inserts decision_log first, then uses returned PK for child records
  - Still fire-and-forget, non-blocking, no UI changes, no existing table changes
  - Intent: institutional memory and observability layer
- 2026-02-09: Consolidated brain recorder into unified logDecision function
  - Replaced brain-recorder.ts (multi-method) with logDecision.ts (single function)
  - logDecision(input) inserts decision_log, optionally decision_reasoning, then decision_audit
  - Fails silently (returns null on error), never blocks app responses
  - Schema simplified: removed Drizzle FK references from decision_reasoning/decision_audit (kept uuid columns)
  - Routes updated to call logDecision() directly at each choke point
- 2026-02-09: Stored Company Brain schema as future planning reference
- 2026-02-09: Continued hardening pass
  - Fixed dashboard "View All" link (removed unsupported ?sort=debt query)
  - Renamed "Sign In" to "Enter" (no auth system exists)
  - Removed manual hover overrides from landing page buttons
  - Updated 404 page to professional copy with return navigation
- 2026-02-06: Review-ready hardening
  - Replaced promotional AI language with conservative terms in-app
  - Removed randomness from debt score calculation (deterministic)
  - Removed non-functional Amend button
  - Made landing page CTAs functional
- 2026-02-04: Initial implementation of AXIOM™ MVP
  - Complete data model with all core entities
  - Landing page with marketing copy
  - Dashboard with Decision Debt visualization
  - Decisions CRUD with version history
  - Alerts management with acknowledge workflow
  - Board Mode for executive oversight
  - Seeded database with realistic demo data
