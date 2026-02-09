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
- 2026-02-09: Company Brain v1 foundation (non-disruptive)
  - Added 3 passive brain tables: brain_decision_log, brain_reasoning_summary, brain_audit_trail
  - Created brain-recorder.ts module (fire-and-forget, non-blocking writes)
  - Instrumented existing routes to passively record: decision creation, amendments, assumption changes, alert creation/acknowledgment
  - No UI changes, no schema changes to existing tables, no enforcement or auto-execution
  - Intent: institutional memory and observability layer
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
