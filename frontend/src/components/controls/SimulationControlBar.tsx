import { useState } from 'react'
import {
  AlertOctagon,
  Flame,
  Layers,
  Pause,
  Play,
  RefreshCw,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react'
import type { LiveState, ScenarioType } from '../../types'
import {
  applyIntervention,
  resetSimulation,
  startSimulation,
  stopSimulation,
} from '../../services/api'

interface SimulationControlBarProps {
  liveState: LiveState
  onActionError?: (err: string) => void
}

const SCENARIOS: { id: ScenarioType; label: string; icon: typeof Users; color: string }[] = [
  { id: 'NORMAL', label: 'Normal Operation', icon: Layers, color: 'text-emerald-400' },
  { id: 'FIRE', label: 'Fire Outbreak', icon: Flame, color: 'text-red-400' },
  { id: 'CROWD_SURGE', label: 'Crowd Surge', icon: Users, color: 'text-amber-400' },
  {
    id: 'RESTRICTED_INTRUSION',
    label: 'Restricted Intrusion',
    icon: ShieldAlert,
    color: 'text-purple-400',
  },
  { id: 'MULTI_HAZARD', label: 'Multi-Hazard Demo', icon: AlertOctagon, color: 'text-orange-400' },
]

const LOCATIONS = [
  'Gate 2',
  'Gate 1',
  'Gate 3',
  'Gate 4',
  'Platform 1',
  'Platform 2',
  'Service Area',
]

export default function SimulationControlBar({
  liveState,
  onActionError,
}: SimulationControlBarProps) {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>(
    (liveState.scenario as ScenarioType) || 'NORMAL'
  )
  const [intensity, setIntensity] = useState<number>(75)
  const [crowdSize, setCrowdSize] = useState<number>(350)
  const [location, setLocation] = useState<string>('Gate 2')
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const isRunning = liveState.running
  const isInterventionActive = liveState.intervention_active

  const handleStart = async () => {
    setIsLoading(true)
    try {
      await startSimulation({
        scenario: selectedScenario,
        intensity,
        crowd_size: crowdSize,
        incident_location: location,
      })
    } catch (err: any) {
      if (onActionError) onActionError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStop = async () => {
    setIsLoading(true)
    try {
      await stopSimulation()
    } catch (err: any) {
      if (onActionError) onActionError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async () => {
    setIsLoading(true)
    try {
      await resetSimulation()
    } catch (err: any) {
      if (onActionError) onActionError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleIntervention = async () => {
    setIsLoading(true)
    try {
      await applyIntervention(!isInterventionActive)
    } catch (err: any) {
      if (onActionError) onActionError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-rakshak-panel border-b border-rakshak-border px-4 py-2.5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Scenario Selection */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rakshak-bg rounded border border-rakshak-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rakshak-muted">
              Scenario:
            </span>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value as ScenarioType)}
              className="bg-transparent text-xs font-semibold text-gray-200 outline-none cursor-pointer"
            >
              {SCENARIOS.map((sc) => (
                <option key={sc.id} value={sc.id} className="bg-rakshak-panel text-gray-200">
                  {sc.label}
                </option>
              ))}
            </select>
          </div>

          {/* Location Selection */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rakshak-bg rounded border border-rakshak-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rakshak-muted">
              Location:
            </span>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-transparent text-xs font-semibold text-gray-200 outline-none cursor-pointer"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc} className="bg-rakshak-panel text-gray-200">
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sliders: Intensity & Crowd Size */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-rakshak-muted uppercase tracking-wider">
              Intensity: <span className="font-mono text-cyan-400 font-bold">{intensity}%</span>
            </span>
            <input
              type="range"
              min="10"
              max="100"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-20 h-1.5 bg-rakshak-border rounded-lg appearance-none cursor-pointer accent-rakshak-accent"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-rakshak-muted uppercase tracking-wider">
              Crowd: <span className="font-mono text-cyan-400 font-bold">{crowdSize}</span>
            </span>
            <input
              type="range"
              min="50"
              max="800"
              step="50"
              value={crowdSize}
              onChange={(e) => setCrowdSize(Number(e.target.value))}
              className="w-20 h-1.5 bg-rakshak-border rounded-lg appearance-none cursor-pointer accent-rakshak-accent"
            />
          </div>
        </div>

        {/* Action Controls & Intervention */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              START SIMULATION
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded shadow transition-colors disabled:opacity-50"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              PAUSE
            </button>
          )}

          <button
            onClick={handleReset}
            disabled={isLoading}
            title="Reset Simulation"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-rakshak-bg hover:bg-rakshak-border text-rakshak-muted hover:text-white text-xs font-medium rounded border border-rakshak-border transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            RESET
          </button>

          {/* RAKSHAK Intervention Toggle */}
          <div className="h-6 w-px bg-rakshak-border mx-1" />

          <button
            onClick={handleToggleIntervention}
            disabled={isLoading || !isRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded border transition-all ${
              isInterventionActive
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.4)] animate-pulse'
                : 'bg-rakshak-bg text-rakshak-muted border-rakshak-border hover:border-gray-500'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>INTERVENTION:</span>
            <span className={isInterventionActive ? 'text-cyan-300' : 'text-gray-400'}>
              {isInterventionActive ? 'ACTIVE (REDIRECTING)' : 'OFF'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
