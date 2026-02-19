import { createHash } from "crypto";

export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function computeSnapshotHash(inputJson: Record<string, unknown>): string {
  const sorted = JSON.stringify(inputJson, Object.keys(inputJson).sort());
  return sha256(sorted);
}

export function computeDecisionHash(params: {
  snapshotHash: string;
  ruleHits: { ruleId: string; hit: boolean; outcome?: string }[];
  principles: { principleId: string; applied: boolean; priority: number }[];
  outcome: string;
  timestamp: string;
}): string {
  const sortedHits = [...params.ruleHits]
    .sort((a, b) => a.ruleId.localeCompare(b.ruleId))
    .map((h) => `${h.ruleId}:${h.hit}:${h.outcome || ""}`)
    .join("|");

  const sortedPrinciples = [...params.principles]
    .sort((a, b) => a.principleId.localeCompare(b.principleId))
    .map((p) => `${p.principleId}:${p.applied}:${p.priority}`)
    .join("|");

  return sha256(
    `${params.snapshotHash}|${sortedHits}|${sortedPrinciples}|${params.outcome}|${params.timestamp}`
  );
}

export function computeDecisionFingerprint(params: {
  inputSnapshot: Record<string, unknown>;
  ruleHits: { ruleId: string; hit: boolean; outcome?: string }[];
  principles: { principleId: string; applied: boolean; priority: number }[];
  outcome: string;
  modelVersion: string;
  timestamp: string;
}): string {
  const snapshotStr = JSON.stringify(
    params.inputSnapshot,
    Object.keys(params.inputSnapshot).sort()
  );

  const sortedHits = [...params.ruleHits]
    .sort((a, b) => a.ruleId.localeCompare(b.ruleId))
    .map((h) => `${h.ruleId}:${h.hit}:${h.outcome || ""}`)
    .join("|");

  const sortedPrinciples = [...params.principles]
    .sort((a, b) => a.principleId.localeCompare(b.principleId))
    .map((p) => `${p.principleId}:${p.applied}:${p.priority}`)
    .join("|");

  return sha256(
    `${snapshotStr}|${sortedHits}|${sortedPrinciples}|${params.outcome}|${params.modelVersion}|${params.timestamp}`
  );
}

export const ALIGNMENT_SCORE_VERSION = "v1.0";
export const ALIGNMENT_FORMULA_VERSION = "v1.0-2026Q1";

export function computeAlignmentScore(params: {
  ruleHitCount: number;
  avgPrinciplePriority: number;
  hasOverrides: boolean;
  validatedAssumptionCount: number;
}): number {
  const ruleComponent = params.ruleHitCount * 15;
  const principleComponent = params.avgPrinciplePriority * 0.6;
  const overrideBonus = params.hasOverrides ? 0 : 20;
  const assumptionComponent = params.validatedAssumptionCount * 5;

  return ruleComponent + principleComponent + overrideBonus + assumptionComponent;
}

export function computeBundleHash(params: {
  decisionData: Record<string, unknown>;
  snapshot: Record<string, unknown>;
  rules: unknown[];
  principles: unknown[];
  overrides: unknown[];
  assumptions: unknown[];
  exportTimestamp: string;
}): string {
  const payload = JSON.stringify({
    d: params.decisionData,
    s: params.snapshot,
    r: params.rules,
    p: params.principles,
    o: params.overrides,
    a: params.assumptions,
    t: params.exportTimestamp,
  });
  return sha256(payload);
}
