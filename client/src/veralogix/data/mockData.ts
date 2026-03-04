import type { VeralogixSnapshot, TimelineEvent, AIFinding } from '../types/veralogix';

export const mockSnapshot: VeralogixSnapshot = {
  title: 'Decision Snapshot',
  decisionName: 'Sample Decision',
  supplier: 'TechCorp Inc.',
  analysisId: 'VX-2026-0304-001',
  timestamp: '2026-03-04T18:45:00Z',
  mode: 'Live',
  cached: false,
  integrityScore: 94.5,
  riskNow: 12.3,
  riskBaseline: 8.7,
  confidenceBaseline: 78.2,
  confidenceNow: 85.6,
  assumptions: [
    { id: 'a1', description: 'Market volatility remains within historical bounds' },
    { id: 'a2', description: 'Supplier maintains current performance levels' }
  ],
  driftFlags: [
    { isDrifting: false, reason: undefined }
  ],
  aiFindings: [
    { findingId: 'f1', severity: 'medium', description: 'Emerging market risks detected' }
  ],
  budget: {
    amount: 500000,
    currency: 'USD'
  }
};

export const mockTimeline: TimelineEvent[] = [
  {
    timestamp: '09:55',
    event: 'Decision initialized',
    details: 'System started processing'
  },
  {
    timestamp: '09:58',
    event: 'Supplier risk evaluated',
    details: 'AI Engine completed risk assessment'
  },
  {
    timestamp: '10:00',
    event: 'Assumptions validated',
    details: 'Policy Layer validated all assumptions'
  },
  {
    timestamp: '10:02',
    event: 'Drift flags detected',
    details: 'Monitoring Engine detected drift in metrics'
  },
  {
    timestamp: '10:05',
    event: 'Decision snapshot generated',
    details: 'Veralogix completed snapshot analysis'
  }
];

export const mockAIFindings: AIFinding[] = [
  {
    findingId: 'finding-001',
    severity: 'high',
    description: 'Critical assumption violation detected in supplier risk model'
  },
  {
    findingId: 'finding-002',
    severity: 'medium',
    description: 'Market volatility trend shows divergence from baseline'
  },
  {
    findingId: 'finding-003',
    severity: 'low',
    description: 'Minor data quality issue in secondary metrics'
  }
];
