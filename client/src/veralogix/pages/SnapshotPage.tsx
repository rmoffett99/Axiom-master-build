import React from "react";

export default function SnapshotPage(): React.ReactElement {
  const snapshot = {
    title: "Decision Snapshot",
    decisionName: "Sample Decision",
  };

  const timeline = [
    { time: "09:55", event: "Decision initialized", actor: "System" },
    { time: "09:58", event: "Supplier risk evaluated", actor: "AI Engine" },
    { time: "10:00", event: "Assumptions validated", actor: "Policy Layer" },
    { time: "10:02", event: "Drift flags detected", actor: "Monitoring Engine" },
    { time: "10:05", event: "Decision snapshot generated", actor: "Veralogix" }
  ];

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>
        {snapshot.title}
      </h1>
      <div>
        <h2>Decision Timeline</h2>
        <ul>
          {timeline.map((entry, index) => (
            <li key={index}>
              <strong>{entry.time}</strong>: {entry.event} (Actor: {entry.actor})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}