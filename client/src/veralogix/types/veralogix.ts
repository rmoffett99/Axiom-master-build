// Strict TypeScript types for Veralogix

type Severity = 'low' | 'medium' | 'high';

type Assumption = {
    id: string;
    description: string;
};

type DriftFlag = {
    isDrifting: boolean;
    reason?: string;
};

type Budget = {
    amount: number;
    currency: string;
};

type AIFinding = {
    findingId: string;
    severity: Severity;
    description: string;
};

type VeralogixSnapshot = {
    timestamp: string;
    findings: AIFinding[];
    budget: Budget;
};

type TimelineEvent = {
    timestamp: string;
    event: string;
    details?: string;
};

type GraphNode<T> = {
    id: string;
    data: T;
};

type GraphEdge<T> = {
    from: string;
    to: string;
    data: T;
};

type ConstellationGraph<T> = {
    nodes: GraphNode<T>[];
    edges: GraphEdge<T>[];
};

type ShockwaveRing = {
    radius: number;
    color: string;
};

type ShockwaveNode = {
    position: { x: number; y: number; };
    value: number;
};

type ShockwaveModel = {
    rings: ShockwaveRing[];
    nodes: ShockwaveNode[];
};

// Exporting types
export {
    Severity,
    Assumption,
    DriftFlag,
    Budget,
    AIFinding,
    VeralogixSnapshot,
    TimelineEvent,
    GraphNode,
    GraphEdge,
    ConstellationGraph,
    ShockwaveRing,
    ShockwaveNode,
    ShockwaveModel
};