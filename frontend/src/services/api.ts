import type {
  EvacuationInspectionResponse,
  HealthResponse,
  RiskAssessment,
  ScenarioType,
  SystemStatus,
} from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/api/health`)
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`)
  }
  return response.json()
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  const response = await fetch(`${API_URL}/api/system/status`)
  if (!response.ok) {
    throw new Error(`System status check failed: ${response.status}`)
  }
  return response.json()
}

export interface SimulationStartParams {
  scenario: ScenarioType | string
  intensity: number
  crowd_size: number
  incident_location: string
}

export async function startSimulation(params: SimulationStartParams): Promise<{
  status: string
  scenario: string
  data_source: string
}> {
  const response = await fetch(`${API_URL}/api/simulation/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to start simulation: ${response.status}`)
  }
  return response.json()
}

export async function stopSimulation(): Promise<{ status: string }> {
  const response = await fetch(`${API_URL}/api/simulation/stop`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Failed to stop simulation: ${response.status}`)
  }
  return response.json()
}

export async function resetSimulation(): Promise<{ status: string }> {
  const response = await fetch(`${API_URL}/api/simulation/reset`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Failed to reset simulation: ${response.status}`)
  }
  return response.json()
}

export async function applyIntervention(active: boolean): Promise<{
  intervention_active: boolean
  data_source: string
}> {
  const response = await fetch(`${API_URL}/api/simulation/intervention`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  })
  if (!response.ok) {
    throw new Error(`Failed to apply intervention: ${response.status}`)
  }
  return response.json()
}

export async function fetchCurrentRisk(): Promise<RiskAssessment> {
  const response = await fetch(`${API_URL}/api/risk/current`)
  if (!response.ok) {
    throw new Error(`Failed to fetch current risk: ${response.status}`)
  }
  return response.json()
}

export async function fetchAnalytics(): Promise<any> {
  const response = await fetch(`${API_URL}/api/analytics`)
  if (!response.ok) {
    throw new Error(`Failed to fetch analytics: ${response.status}`)
  }
  return response.json()
}

export async function fetchEvacuationRoutes(): Promise<EvacuationInspectionResponse> {
  const response = await fetch(`${API_URL}/api/evacuation/routes`)
  if (!response.ok) {
    throw new Error(`Failed to fetch evacuation routes: ${response.status}`)
  }
  return response.json()
}

export async function switchPipelineMode(dataSource: 'SIMULATION' | 'REAL_PERCEPTION'): Promise<{
  data_source: string
  status: string
}> {
  const response = await fetch(`${API_URL}/api/video/mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data_source: dataSource }),
  })
  if (!response.ok) {
    throw new Error(`Failed to switch mode: ${response.status}`)
  }
  return response.json()
}

export async function fetchLatestAuditReport(): Promise<any> {
  const response = await fetch(`${API_URL}/api/reports/latest`)
  if (!response.ok) {
    throw new Error(`Failed to fetch audit report: ${response.status}`)
  }
  return response.json()
}

export async function generateAuditReport(): Promise<any> {
  const response = await fetch(`${API_URL}/api/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`Failed to generate audit report: ${response.status}`)
  }
  return response.json()
}

export async function fetchReportMarkdown(): Promise<string> {
  const response = await fetch(`${API_URL}/api/reports/markdown`)
  if (!response.ok) {
    throw new Error(`Failed to fetch markdown report: ${response.status}`)
  }
  return response.text()
}

export { API_URL }
