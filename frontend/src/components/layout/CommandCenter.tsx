import { useState } from 'react'
import { AlertCircle, X } from 'lucide-react'
import type { ConnectionStatus, LiveState } from '../../types'
import Header from './Header'
import DemoModeBanner from './DemoModeBanner'
import SimulationControlBar from '../controls/SimulationControlBar'
import IncidentFeed from '../panels/IncidentFeed'
import DigitalTwin from '../panels/DigitalTwin'
import IntelligencePanel from '../panels/IntelligencePanel'
import AnalyticsTimeline from '../panels/AnalyticsTimeline'
import SystemStatus from '../panels/SystemStatus'

interface CommandCenterProps {
  backendOnline: boolean
  serviceName?: string
  connectionStatus: ConnectionStatus
  liveState: LiveState
  lastTickLatencyMs?: number
  onReconnect: () => void
}

export default function CommandCenter({
  backendOnline,
  serviceName,
  connectionStatus,
  liveState,
  lastTickLatencyMs,
  onReconnect,
}: CommandCenterProps) {
  const [actionError, setActionError] = useState<string | null>(null)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-rakshak-bg text-gray-100 font-sans">
      <DemoModeBanner />
      <Header
        backendOnline={backendOnline}
        serviceName={serviceName}
        connectionStatus={connectionStatus}
        liveState={liveState}
        lastTickLatencyMs={lastTickLatencyMs}
        onReconnect={onReconnect}
      />

      {/* Interactive Simulation Control Bar */}
      <SimulationControlBar
        liveState={liveState}
        onActionError={(err) => setActionError(err)}
      />

      {/* Error Alert Toast */}
      {actionError && (
        <div className="bg-red-500/20 border-b border-red-500/50 px-4 py-1.5 flex items-center justify-between text-xs text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Grid Layout */}
      <main className="flex-1 p-3 grid grid-rows-[1fr_135px] gap-3 min-h-0">
        {/* Top section: 3-column layout */}
        <div className="grid grid-cols-12 gap-3 min-h-0">
          {/* Left (3 cols): Incident feed + System status */}
          <div className="col-span-3 flex flex-col gap-3 min-h-0">
            <div className="flex-1 min-h-0">
              <IncidentFeed liveState={liveState} />
            </div>
            <div className="h-44 shrink-0">
              <SystemStatus
                backendOnline={backendOnline}
                connectionStatus={connectionStatus}
                liveState={liveState}
              />
            </div>
          </div>

          {/* Center (6 cols): Live Digital Twin / Station Canvas */}
          <div className="col-span-6 min-h-0 flex flex-col">
            <DigitalTwin liveState={liveState} />
          </div>

          {/* Right (3 cols): Live AI intelligence panel */}
          <div className="col-span-3 min-h-0 flex flex-col">
            <IntelligencePanel liveState={liveState} />
          </div>
        </div>

        {/* Bottom: Real-Time Analytics timeline and telemetry */}
        <div className="min-h-0">
          <AnalyticsTimeline liveState={liveState} />
        </div>
      </main>
    </div>
  )
}
