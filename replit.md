# AXIOM™ - Enterprise Decision Intelligence Platform

## Overview
AXIOM™ is an Enterprise Decision Intelligence Platform designed as a system of record for organizational decisions. It captures the rationale, assumptions, ownership, and review cycles of decisions. The platform proactively identifies "Decision Debt™" by detecting risks such as expired assumptions, changes in ownership, overdue reviews, or contradictory decisions. Its core purpose is to provide institutional memory, enhance accountability, and ensure auditability for all decision-making processes.

## User Preferences
Application is frozen for demos — only bug fixes allowed, no new features or copy changes. All scores must be deterministic (no Math.random or volatile calculations). Conservative language for financial reviewers — "System-generated" not "AI-detected". Landing page retains marketing positioning ("AI-ready decision intelligence"); in-app copy is conservative. If something is not fully reliable, hide it rather than approximate it. Priority: reviewer trust over feature completeness.

## System Architecture

### Core Principles
-   **Append-Only**: Decisions are immutable; all changes create new versions.
-   **Accountability**: Each decision has a single accountable human owner.
-   **Auditability**: A complete audit trail is maintained for all actions.
-   **Institutional Memory**: Designed to preserve context despite leadership changes.

### UI/UX Decisions
-   **Frontend Framework**: React with TypeScript, Vite.
-   **Styling**: Tailwind CSS for utility-first styling, shadcn/ui for components.
-   **Pages**:
    -   **Landing Page (`/`)**: Marketing-focused with hero, problem, solution, and features.
    -   **Dashboard (`/dashboard`)**: Overview of decision health, debt trends, critical alerts, and expiring decisions.
    -   **Decisions List (`/decisions`)**: Table view with search, filter, and creation CTA.
    -   **Decision Detail (`/decisions/:id`)**: Comprehensive view with tabs for overview, assumptions, evidence, version history, and alerts.
    -   **New Decision (`/decisions/new`)**: Multi-step guided form for structured decision entry.
    -   **Alerts (`/alerts`)**: Management interface for alerts with severity and status filters.
    -   **Board Mode (`/board`)**: Read-only executive summary with key metrics, risk overviews, and export functionality.

### Technical Implementations
-   **Multi-Tenancy**: Implemented with row-level security (RLS) and organization-scoped data isolation. All tenant tables have `organization_id` and RLS policies. Request-scoped DB connections ensure data separation.
-   **Company Brain (Institutional Memory & Rules Engine)**:
    -   **Core**: `brain_decision` table records decision attributes, confidence, alignment scores, and immutable snapshots. Uses SHA256 hashing for data integrity.
    -   **Principles & Rules**: `principle` and `rule` tables define organizational principles and conditional evaluation rules.
    -   **Rule Hits**: `decision_rule_hit` records the outcome of rule evaluations.
    -   **Controlled Actions & Approvals**: `action`, `action_proposal`, `action_approval`, `action_execution`, and `automation_settings` tables manage automated actions based on rule outcomes, including human review and kill switch functionalities.
    -   **Replay Engine**: Deterministically recomputes alignment scores and outcomes to detect drift, storing `replay_mismatch_alerts`.
    -   **Audit Trails**: Extensive audit logging (`audit_access_log`, `audit_export_log`) for all data access and exports.
    -   **Immutability**: Database triggers block UPDATE/DELETE operations on critical audit and brain tables to ensure data integrity.
-   **State Management**: TanStack React Query for data fetching and caching.
-   **API Design**: RESTful API endpoints for all core functionalities.

### System Design Choices
-   **Backend**: Express.js with TypeScript.
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Data Model**: Includes Users, Teams, Decisions, DecisionVersions, Assumptions, Alerts, AuditLogs, and a comprehensive set of "Company Brain" tables for institutional memory, rules, and actions.
-   **Hardening Rules**: Strict rules for deterministic scores, conservative language, and hiding unreliable features to build reviewer trust.

## External Dependencies
-   **PostgreSQL**: Primary database for all application data.
-   **Vite**: Frontend build tool.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **shadcn/ui**: Reusable UI components.
-   **TanStack React Query**: Asynchronous state management library.
-   **Express.js**: Backend web application framework.
-   **Drizzle ORM**: TypeScript ORM for PostgreSQL.
-   **Resend**: Email delivery for demo request form (via fetch to Resend API, no SDK). Uses `RESEND_API_KEY` secret. Configured manually (not via Replit integration connector). Sends to hello@axiomdecisionlayer.com.