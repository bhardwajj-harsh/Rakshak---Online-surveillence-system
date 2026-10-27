import { RefreshCw, Shield, Wifi, WifiOff } from 'lucide-react'
import type { ConnectionStatus, LiveState } from '../../types'

interface HeaderProps {
  backendOnline: boolean
  serviceName?: string
  connectionStatus: ConnectionStatus
  liveState: LiveState
  lastTickLatencyMs?: number
  onReconnect?: () => void
}

export default function Header({
  backendOnline,
  serviceName,
  connectionStatus,
  liveState,
  lastTickLatencyMs = 0,
  onReconnect,
}: HeaderProps) {
  const isWsConnected = connectionStatus === 'CONNECTED'
  const isRunning = liveState.running

  return (
    <header className="border-b border-rakshak-border bg-rakshak-panel/90 backdrop-blur-sm sticky top-0 z-20">
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rakshak-accent/10 border border-rakshak-accent/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
            <Shield className="w-5 h-5 text-rakshak-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight">
                RAKSHAK <span className="text-rakshak-accent font-mono">COMMAND CENTER</span>
              </h1>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-rakshak-bg border border-rakshak-border text-gray-400">
                v0.1.0 SIH
              </span>
            </div>
            <p className="text-[10px] text-rakshak-muted uppercase tracking-widest font-mono">
              Predictive Emergency Intelligence & Response Platform
            </p>
          </div>
        </div>

        {/* Center Live Badges */}
        <div className="hidden md:flex items-center gap-3">
          {/* Simulation Status Badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-rakshak-bg border border-rakshak-border">
            <div
              className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
              }`}
            />
            <span className="text-[11px] font-mono font-medium text-gray-300">
              SIMULATION:{' '}
              <span className={isRunning ? 'text-emerald-400' : 'text-gray-400'}>
                {isRunning ? 'RUNNING' : 'STANDBY'}
              </span>
            </span>
            {isRunning && (
              <span className="text-[10px] font-mono text-rakshak-accent bg-rakshak-accent/10 px-1.5 py-0.2 rounded">
                Tick #{liveState.tick}
              </span>
            )}
          </div>

          {/* Scenario Badge */}
          <div className="px-2.5 py-1 rounded bg-rakshak-bg border border-rakshak-border text-[11px] font-mono">
            <span className="text-rakshak-muted">SCENARIO: </span>
            <span className="text-orange-400 font-bold">{liveState.scenario}</span>
          </div>

          {/* Data Source Badge */}
          <div className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-amber-500/10 border border-amber-500/30 text-amber-300">
            {liveState.data_source || 'SIMULATION'}
          </div>
        </div>

        {/* Right Status Indicators */}
        <div className="flex items-center gap-3">
          {/* Backend Health Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono bg-rakshak-bg border border-rakshak-border text-gray-300">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                backendOnline ? 'bg-emerald-400' : 'bg-red-500'
              }`}
            />
            <span>API: {backendOnline ? serviceName || 'ONLINE' : 'OFFLINE'}</span>
          </div>

          {/* WebSocket Status */}
          <div className="flex items-center gap-2 text-xs">
            {isWsConnected ? (
              <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded font-mono text-[11px]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <Wifi className="w-3.5 h-3.5" />
                <span>WS: LIVE</span>
                {lastTickLatencyMs > 0 && (
                  <span className="text-[9px] text-emerald-300 opacity-80 ml-0.5">
                    ({lastTickLatencyMs}ms)
                  </span>
                )}
              </div>
            ) : connectionStatus === 'RECONNECTING' ? (
              <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded font-mono text-[11px]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>RECONNECTING</span>
              </div>
            ) : (
              <button
                onClick={onReconnect}
                className="flex items-center gap-1.5 text-red-400 bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded font-mono text-[11px] hover:bg-red-500/20 transition-colors"
                title="Click to reconnect"
              >
                <WifiOff className="w-3.5 h-3.5" />
                <span>OFFLINE (RETRY)</span>
              </button>
            )}
          </div>

          <div className="text-[11px] font-mono text-rakshak-muted hidden lg:block">
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </header>
  )
}
