import React from "react";

const VeralogixSnapshot: React.FC = () => {
  const snapshot = {
    title: "Decision Snapshot",
    decisionName: "Sample Decision",
    supplier: "Supplier X",
    analysisId: "AN123456",
    timestamp: "2026-03-04 10:00:00 UTC",
    mode: "Production",
    cached: true,
    integrityScore: 0.87,
    risk: { now: 0.3, baseline: 0.2, delta: 0.1 },
    confidence: { baseline: 0.95, now: 0.88, decayRatePerDay: 0.02, recheckRequired: true },
    assumptions: [
      { name: "Assumption 1", status: "verified" },
      { name: "Assumption 2", status: "warning" },
      { name: "Assumption 3", status: "failed" },
    ],
    driftFlags: [
      { name: "Flag 1", severity: "high" },
      { name: "Flag 2", severity: "medium" },
      { name: "Flag 3", severity: "low" },
    ],
    aiAdvisory: {
      contradictions: 1,
      blindSpots: 0,
      explanation: "No further explanations available.",
    },
    budget: {
      spendUsd: 1500,
      capUsd: 2000,
      percentUsed: 75,
      aiEnabled: true,
    },
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>
        {snapshot.title}
      </h1>
      <div>
        <strong>Decision Name:</strong> {snapshot.decisionName}
      </div>
      <div>
        <strong>Supplier:</strong> {snapshot.supplier}
      </div>
      <div>
        <strong>Analysis ID:</strong> {snapshot.analysisId}
      </div>
      <div>
        <strong>Timestamp:</strong> {snapshot.timestamp}
      </div>
      <div>
        <strong>Mode:</strong> {snapshot.mode}
      </div>
      <div>
        <strong>Cached:</strong> {snapshot.cached ? "Yes" : "No"}
      </div>
      <div>
        <strong>Integrity Score:</strong> {(snapshot.integrityScore * 100).toFixed(0)}%
      </div>
      <div>
        <strong>Risk:</strong> Now: {snapshot.risk.now}, Baseline: {snapshot.risk.baseline}, Delta: {snapshot.risk.delta}
      </div>
      <div>
        <strong>Confidence:</strong> Baseline: {snapshot.confidence.baseline}, Now: {snapshot.confidence.now}, Decay Rate per Day: {snapshot.confidence.decayRatePerDay},{" "}
        {snapshot.confidence.recheckRequired && <span>Recheck Required</span>}
      </div>
      <div>
        <strong>Assumptions:</strong>
        <ul>
          {snapshot.assumptions.map((assumption, index) => (
            <li key={index}>
              {assumption.name}: {assumption.status}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <strong>Drift Flags:</strong>
        <ul>
          {snapshot.driftFlags.map((flag, index) => (
            <li key={index}>
              {flag.name}: {flag.severity}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <strong>AI Advisory:</strong> Contradictions: {snapshot.aiAdvisory.contradictions}, Blind Spots: {snapshot.aiAdvisory.blindSpots}, Explanation: {" "}
        {snapshot.aiAdvisory.explanation}.
      </div>
      <div>
        <strong>Budget:</strong> Spend: ${snapshot.budget.spendUsd}, Cap: ${snapshot.budget.capUsd}, Percent Used: {snapshot.budget.percentUsed}%, AI Enabled: {" "}
        {snapshot.budget.aiEnabled ? "Yes" : "No"}
      </div>
    </div>
  );
};

export default VeralogixSnapshot;
