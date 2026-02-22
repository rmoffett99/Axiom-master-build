# Routing Stability — Baseline & Operational Procedures

## 1. Production Baseline (Established 2026-02-22)

### 404 Rate
- **Baseline: 0 per hour**
- Production logs show zero 404 responses since deployment of the routing fix (commit 52bf2d4).
- Expected steady-state: near-zero. Any 404s should only occur for genuinely unknown URLs.

### Redirect Rate (302/307)
- **Baseline: 0 per hour (server-side)**
- Redirects from `/dashboard` → `/org/:slug/dashboard` are handled client-side by `OrgProvider` (no server 302/307 involved). The server never issues redirects for these paths.

### Request Duration
- **POST /api (demo request): ~709ms** (observed in production logs)
- **/dashboard, /org/\*/dashboard, /decisions, /alerts**: These are client-side routes served by the Vite SPA bundle. The server serves the same `index.html` for all routes; individual page load time is determined by API calls after hydration. No server-side per-route latency applies.

### Summary Table

| Metric                        | Baseline Value     | Source              |
|-------------------------------|--------------------|---------------------|
| 404 count/hour                | 0                  | Production logs     |
| Server redirect count/hour    | 0 (client-side)    | Architecture review |
| POST /api latency             | ~709ms             | Production logs     |
| SPA route serve latency       | N/A (static SPA)   | Architecture review |

---

## 2. Pre-Deploy / Pre-Demo Operational Check

**Before any deploy or demo window, run this procedure:**

1. **Check production logs** for the last 1–2 hours:
   - Filter for `404`, `error`, `ENOENT`, `not found`
   - If any 404s appear on business-critical paths (`/dashboard`, `/decisions`, `/alerts`, `/org/axiom-demo/*`), **halt deploy/demo** and investigate.

2. **Compare against baseline:**
   - 404 count should be 0 on critical paths.
   - Any 404 spike on `/dashboard` or `/org/*/dashboard` indicates a routing regression.
   - Any new server-side 302/307 redirects on these paths indicates unexpected behavior.

3. **Run the E2E anti-regression test** (see Section 4 below) against the staging/dev environment before deploying.

4. **Decision gate:**
   - If baseline deviation exists → halt deploy/demo, investigate `org-context.tsx` for changes.
   - If baseline is nominal → proceed.

---

## 3. Routing Fix — Protected Stability Boundary

### Invariant (MUST NOT BE VIOLATED)

> **`NotFound` cannot render while `showLoading` is true in `OrgProvider`.**

This is enforced structurally in `client/src/lib/org-context.tsx`:

```
showLoading = isLoading || (isOrgRoute && !activeOrg) || (needsRedirect && organizations.length === 0)
```

When `showLoading` is `true`, **only the branded spinner renders**. The `children` prop (which contains `OrgRoutes` → `Switch` → `NotFound`) is never mounted.

### Protected File

**`client/src/lib/org-context.tsx`** is a protected stability boundary.

Any future change to this file that modifies:
- The `needsRedirect` logic (line 95)
- The `showLoading` gating logic (line 96)
- The conditional render (lines 108–115)

...is a **potential regression** and must be verified against all four acceptance criteria:

| Test | Requirement |
|------|-------------|
| A | Hard refresh on `/dashboard` → zero 404 flash |
| B | Click "Enter" from landing → zero 404 flash |
| C | Navigate to `/decisions`, `/alerts` → zero 404 flash |
| D | Unknown URL → 404 correctly appears |

### Root Cause (for future reference)

The original bug: `useOrgLink()` on the landing page (outside `OrgProvider`) returned `/dashboard` without org prefix. When navigating there, `isOrgRoute` was `false`, so `showLoading` was `false`, and `OrgRoutes` Switch rendered immediately — falling through to `NotFound` before the redirect `useEffect` fired.

Fix: `needsRedirect` detects non-org, non-landing routes and keeps `showLoading` true until organizations load and the redirect completes.

---

## 4. Anti-Regression Test Script

Run this E2E test before any deploy. All four tests must pass.

**Test A — Hard refresh on /dashboard:**
1. Navigate directly to `/dashboard`
2. Verify "Page not found" never appears
3. Verify URL resolves to `/org/:slug/dashboard`
4. Verify dashboard content loads

**Test B — "Enter" button navigation:**
1. Navigate to `/` (landing page)
2. Click "Enter" button (data-testid: `button-login`)
3. Verify "Page not found" never appears during transition
4. Verify dashboard loads

**Test C — Direct org route navigation:**
1. Navigate to `/org/axiom-demo/decisions`
2. Verify "Page not found" does not appear
3. Navigate to `/org/axiom-demo/alerts`
4. Verify "Page not found" does not appear

**Test D — Unknown URL (positive control):**
1. Navigate to `/org/axiom-demo/does-not-exist`
2. Verify "Page not found" IS displayed (expected behavior)

**Pass criteria:** Tests A–C show zero "Page not found". Test D shows "Page not found".
**Fail criteria:** Any appearance of "Page not found" during Tests A–C is a regression.
