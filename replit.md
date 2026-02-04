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

## Recent Changes
- 2026-02-04: Initial implementation of AXIOM™ MVP
  - Complete data model with all core entities
  - Landing page with marketing copy
  - Dashboard with Decision Debt visualization
  - Decisions CRUD with version history
  - Alerts management with acknowledge workflow
  - Board Mode for executive oversight
  - Seeded database with realistic demo data
