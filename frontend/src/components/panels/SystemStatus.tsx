import { Activity, Brain, Radio, Shield, Video } from 'lucide-react'
import type { ConnectionStatus, LiveState } from '../../types'

interface SystemStatusProps {
  backendOnline: boolean
  connectionStatus: ConnectionStatus
  liveState: LiveState
}

export default function SystemStatus({
  backendOnline,
  connectionStatus,
  liveState,
}: SystemStatusProps) {
  const isWs = connectionStatus === 'CONNECTED'
  const isRunning = liveState.running

  const systems = [
    {
      name: 'AI Risk Engine',
      status: backendOnline ? 'ONLINE' : 'OFFLINE',
      active: backendOnline,
      icon: Brain,
      sub: 'Multi-factor weighted',
    },
    {
      name: 'Live WebSocket',
      status: isWs ? 'CONNECTED' : connectionStatus,
      active: isWs,
      icon: Radio,
      sub: isWs ? '5 Hz stream active' : 'Awaiting socket',
    },
    {
      name: 'Digital Twin Sim',
      status: isRunning ? 'RUNNING' : 'READY',
      active: isRunning,
      icon: Shield,
      sub: isRunning ? `Tick #${liveState.tick}` : 'Standby',
    },
    {
      name: 'Video CV Ingest',
      status: isRunning ? 'SIMULATING' : 'STANDBY',
      active: isRunning,
      icon: Video,
      sub: 'Anonymous tracking',
    },
  ]

  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-rakshak-muted flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          System Status & Telemetry
        </h3>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
          ● {isWs ? 'LIVE FEED' : 'STANDBY'}
        </span>
      </div>

      <div className="p-3 grid grid-cols-2 gap-2">
        {systems.map(({ name, status, active, icon: Icon, sub }) => (
          <div
            key={name}
            className="flex items-start gap-2 px-2.5 py-2 rounded bg-rakshak-bg/60 border border-rakshak-border/60 hover:border-rakshak-border transition-colors"
          >
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-cyan-400' : 'text-gray-500'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 font-medium truncate">{name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    active ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                  }`}
                />
                <span className="text-[11px] font-mono font-bold text-gray-200">{status}</span>
              </div>
              <p className="text-[9px] font-mono text-rakshak-muted mt-0.5 truncate">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
