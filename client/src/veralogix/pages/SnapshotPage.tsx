import React from "react";
import { mockSnapshot, mockTimeline } from "../data/mockData";

const SnapshotPage: React.FC = () => {
  const snapshot = mockSnapshot;
  const timeline = mockTimeline;

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
              <strong>{entry.timestamp}</strong>: {entry.event} (Details: {entry.details})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SnapshotPage;