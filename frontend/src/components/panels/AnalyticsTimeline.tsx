import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, BarChart3, Gauge, TrendingUp, Users, Wind } from 'lucide-react'
import type { LiveState } from '../../types'

interface AnalyticsTimelineProps {
  liveState: LiveState
}

export default function AnalyticsTimeline({ liveState }: AnalyticsTimelineProps) {
  const riskHistory = liveState.risk_history || []
  const crowd = liveState.crowd || {
    total_people: 0,
    density_score: 0,
    average_speed: 0,
    movement_variance: 0,
    dominant_direction: 0,
    density_change_rate: 0,
    congestion_score: 0,
  }

  // Format riskHistory data points for Recharts
  const chartData = riskHistory.map((score, index) => ({
    tick: `-${riskHistory.length - index}`,
    risk: score,
  }))

  // Add dummy points if history is short to keep chart aesthetic
  while (chartData.length < 15) {
    chartData.unshift({
      tick: `-${chartData.length + 1}`,
      risk: 0,
    })
  }

  const latestRisk = riskHistory.length > 0 ? riskHistory[riskHistory.length - 1] : 0

  return (
    <div className="panel h-full flex flex-col min-h-0">
      <div className="panel-header py-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-rakshak-muted">
            Live Intelligence Analytics & Spatial Telemetry
          </h3>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-gray-400">
          <span>
            Current Risk:{' '}
            <strong
              className={
                latestRisk >= 75
                  ? 'text-red-400'
                  : latestRisk >= 50
                  ? 'text-orange-400'
                  : latestRisk >= 25
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }
            >
              {Math.round(latestRisk)}/100
            </strong>
          </span>
          <span className="text-rakshak-muted">|</span>
          <span>
            Window: <strong className="text-gray-200">Last 60 Ticks</strong>
          </span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-3 p-2.5 min-h-0 items-center">
        {/* Real-time Recharts Area Chart (7 cols) */}
        <div className="col-span-7 h-full min-h-[90px] relative bg-rakshak-bg/40 rounded-lg p-1 border border-rakshak-border/50">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={latestRisk >= 65 ? '#ef4444' : '#06b6d4'}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={latestRisk >= 65 ? '#ef4444' : '#06b6d4'}
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>
              <XAxis dataKey="tick" stroke="#4b5563" fontSize={9} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#4b5563" fontSize={9} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  borderColor: '#374151',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
                labelStyle={{ color: '#9ca3af' }}
                itemStyle={{ color: '#06b6d4' }}
              />
              <Area
                type="monotone"
                dataKey="risk"
                name="Risk Score"
                stroke={latestRisk >= 65 ? '#ef4444' : '#06b6d4'}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#riskGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Live Metrics Telemetry Cards (5 cols) */}
        <div className="col-span-5 grid grid-cols-3 gap-2">
          {/* Crowd Count */}
          <div className="p-2 rounded bg-rakshak-bg/60 border border-rakshak-border/60">
            <div className="flex items-center justify-between text-gray-400 mb-0.5">
              <span className="text-[9px] uppercase font-bold tracking-wider">Crowd</span>
              <Users className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="text-base font-mono font-bold text-gray-100">
              {crowd.total_people}
            </div>
            <p className="text-[8px] font-mono text-gray-400">Total agents</p>
          </div>

          {/* Density Score */}
          <div className="p-2 rounded bg-rakshak-bg/60 border border-rakshak-border/60">
            <div className="flex items-center justify-between text-gray-400 mb-0.5">
              <span className="text-[9px] uppercase font-bold tracking-wider">Density</span>
              <Gauge className="w-3 h-3 text-amber-400" />
            </div>
            <div className="text-base font-mono font-bold text-gray-100">
              {Math.round(crowd.density_score)}%
            </div>
            <p className="text-[8px] font-mono text-gray-400">
              {crowd.density_change_rate >= 0 ? `+${crowd.density_change_rate.toFixed(1)}` : crowd.density_change_rate.toFixed(1)}/min
            </p>
          </div>

          {/* Movement Speed */}
          <div className="p-2 rounded bg-rakshak-bg/60 border border-rakshak-border/60">
            <div className="flex items-center justify-between text-gray-400 mb-0.5">
              <span className="text-[9px] uppercase font-bold tracking-wider">Speed</span>
              <Wind className="w-3 h-3 text-purple-400" />
            </div>
            <div className="text-base font-mono font-bold text-gray-100">
              {Math.round(crowd.average_speed)}%
            </div>
            <p className="text-[8px] font-mono text-gray-400">Avg velocity</p>
          </div>

          {/* Circular Variance (Panic) */}
          <div className="p-2 rounded bg-rakshak-bg/60 border border-rakshak-border/60">
            <div className="flex items-center justify-between text-gray-400 mb-0.5">
              <span className="text-[9px] uppercase font-bold tracking-wider">Variance</span>
              <Activity className="w-3 h-3 text-orange-400" />
            </div>
            <div className="text-base font-mono font-bold text-gray-100">
              {Math.round(crowd.movement_variance)}%
            </div>
            <p className="text-[8px] font-mono text-gray-400">Panic index</p>
          </div>

          {/* Exit Congestion */}
          <div className="p-2 rounded bg-rakshak-bg/60 border border-rakshak-border/60">
            <div className="flex items-center justify-between text-gray-400 mb-0.5">
              <span className="text-[9px] uppercase font-bold tracking-wider">Exit Cong.</span>
              <TrendingUp className="w-3 h-3 text-red-400" />
            </div>
            <div className="text-base font-mono font-bold text-gray-100">
              {Math.round(crowd.congestion_score)}%
            </div>
            <p className="text-[8px] font-mono text-gray-400">Peak gate</p>
          </div>

          {/* Dominant Angle */}
          <div className="p-2 rounded bg-rakshak-bg/60 border border-rakshak-border/60">
            <div className="flex items-center justify-between text-gray-400 mb-0.5">
              <span className="text-[9px] uppercase font-bold tracking-wider">Heading</span>
              <Activity className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="text-base font-mono font-bold text-gray-100">
              {crowd.dominant_direction.toFixed(2)} rad
            </div>
            <p className="text-[8px] font-mono text-gray-400">Flow vector</p>
          </div>
        </div>
      </div>
    </div>
  )
}
