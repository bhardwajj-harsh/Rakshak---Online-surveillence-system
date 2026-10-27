export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type ScenarioType =
  | 'NORMAL'
  | 'FIRE'
  | 'CROWD_SURGE'
  | 'RESTRICTED_INTRUSION'
  | 'MULTI_HAZARD'

export type DataSource = 'SIMULATION' | 'REAL_PERCEPTION' | 'HYBRID'

export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR'

export interface TrackedPerson {
  track_id: number
  x: number
  y: number
  vx: number
  vy: number
  speed: number
  direction: number
  in_restricted_zone: boolean
}

export interface Detection {
  detection_type: string
  confidence: number
  location: string
  source: string
}

export interface CrowdState {
  total_people: number
  density_score: number
  average_speed: number
  movement_variance: number
  dominant_direction: number
  density_change_rate: number
  congestion_score: number
  zone_densities: Record<string, number>
}

export interface AnomalyScore {
  overall: number
  crowd_anomaly: number
  movement_anomaly: number
  density_change: number
  fire_probability: number
  restricted_intrusion: number
}

export interface RiskFactors {
  density_anomaly: number
  kinetic_panic: number
  bottleneck_congestion: number
  hazard_proximity: number
}

export interface RiskAssessment {
  overall_score: number
  severity: Severity
  confidence: number
  contributing_factors: string[]
  factors?: Record<string, number> | RiskFactors
  dominant_cause?: string
  projected_risk_10s?: number
  timestamp: string
}

export interface PredictionResult {
  event_type: string
  probability: number
  estimated_time_to_threshold?: number | null
  affected_zone?: string | null
  explanation: string
  label: string
}

export interface ResponseAction {
  action: string
  reason: string
  priority: number
}

export interface EvacuationRoute {
  from_zone: string
  to_zone: string
  status: 'CLEAR' | 'CONGESTED' | 'BLOCKED' | string
  recommended_exit: string
  path: string[]
  distance: number
  estimated_time_seconds: number
}

export interface ResponsePlan {
  incident_type: string
  severity: Severity
  requires_human_approval: boolean
  actions: ResponseAction[]
  evacuation_routes?: EvacuationRoute[]
  safe_exits?: string[]
}

export interface EvacuationInspectionResponse {
  routes: EvacuationRoute[]
  safe_exits: string[]
  hazard_zones: string[]
  graph_nodes: string[]
  data_source: string
}

export interface SimulatedIncident {
  incident_type: string
  severity: Severity
  confidence: number
  location: string
  status: string
  detected_factors: string[]
}

export interface LiveState {
  tick: number
  timestamp: string
  scenario: ScenarioType | string
  running: boolean
  data_source: DataSource | string
  people: TrackedPerson[]
  detections: Detection[]
  crowd: CrowdState
  anomaly: AnomalyScore
  risk: RiskAssessment
  predictions: PredictionResult[]
  incidents: SimulatedIncident[]
  response: ResponsePlan | null
  risk_history: number[]
  fire_active: boolean
  fire_location?: string | null
  intervention_active: boolean
}

export interface LiveStateMessage {
  type: 'LIVE_STATE'
  version: number
  timestamp: string
  data: LiveState
}

export interface HealthResponse {
  status: string
  service: string
}

export interface SystemStatus {
  ai_engine: string
  video_engine: string
  risk_engine: string
  simulation: string
  demo_mode: boolean
}

export interface AuditReport {
  report_id: string
  generated_at: string
  scenario: string
  data_source: string
  incident_location: string
  executive_summary: string
  telemetry_metrics: {
    peak_risk_score: number
    current_risk_score: number
    risk_reduction_pct: number
    tracked_people_count: number
    average_crowd_density: number
    congestion_score: number
    average_movement_speed: number
    panic_entropy_variance: number
  }
  explainable_ai_breakdown: {
    dominant_cause: string
    projected_risk_10s: number
    confidence_score: number
    factors: Record<string, number>
    contributing_factors: string[]
  }
  incident_audit_trail: {
    incident_type: string
    severity: string
    confidence: number
    location: string
    status: string
  }[]
  evacuation_routing: {
    intervention_active: boolean
    safe_exits: string[]
    recommended_corridors_count: number
    routes: {
      from_zone: string
      to_zone: string
      status: string
      recommended_exit: string
      estimated_time_seconds: number
    }[]
  }
  response_actions_recommended: {
    action: string
    reason: string
    priority: number
  }[]
  human_oversight_compliance: {
    requires_human_approval: boolean
    safety_guardrails_active: boolean
    decision_support_only: boolean
  }
}
