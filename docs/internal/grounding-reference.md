# AXIOM Grounding Reference (Internal Only)

## Purpose
This document is the source of truth for implementation fidelity.
It defines the exact problems, features, target users, and mission of AXIOM.
Do NOT surface this block verbatim in the UI.

## Guardrails
1. Content is for internal grounding and implementation fidelity only.
2. "Immutable" in v1 means append-only records with no update/delete operations at the application layer, enforced by schema and permissions — NOT blockchain, crypto, or external ledgers.
3. Prioritize core decision capture, assumption tracking, decision health scoring, and audit trail. Advanced analytics, integrations, and enterprise extras are out of scope.

## Core Enterprise Problem
Decisions are ephemeral and degrade silently, creating massive hidden risk.

## Specific Pain Points AXIOM Addresses
- Important decisions are recorded incompletely or not at all
- Assumptions underlying decisions are never tracked or monitored
- "Decision debt" accumulates invisibly and dangerously
- No centralized, tamper-proof system of record exists for decisions
- Weak or nonexistent audit trails for decisions
- Leadership and boards lack visibility into decision health
- The "why" behind major decisions disappears with turnover

## Exact Features AXIOM Must Deliver
- A structured record of every significant decision, preserving context, ownership, assumptions, and supporting evidence
- Capture decisions with full context — not just outcomes
- Track assumptions over time, including valid, expired, and disproven states
- Detect decision debt before it becomes risk by scoring decision health
- Maintain an append-only, tamper-proof audit trail
- Provide board-ready, read-only executive visibility

## Target Users
- General Counsel — prove who decided what, when, and why
- Compliance & Risk Leaders — monitor assumption health, maintain audit-ready documentation
- Executives & Boards — see organizational decision health without losing institutional memory

## Mission Statements (Verbatim)
- "Every decision recorded. Every assumption tracked. Every audit answered."
- "AXIOM is the system of record for how your organization makes decisions — who owned them, what was assumed, and whether those assumptions still hold."
- "The why behind every important decision — never lost, always accountable, permanently on record."
- "AXIOM ensures that when assumptions change, someone is accountable for reviewing what needs to change with them."
