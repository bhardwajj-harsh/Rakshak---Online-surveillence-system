import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  Flame,
  ShieldAlert,
  Users,
} from 'lucide-react'
import type { LiveState, Severity } from '../../types'

interface IncidentFeedProps {
  liveState: LiveState
}

const severityClasses: Record<Severity, string> = {
  CRITICAL: 'border-red-500/50 bg-red-500/10 text-red-400',
  HIGH: 'border-orange-500/50 bg-orange-500/10 text-orange-400',
  MEDIUM: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
  LOW: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
}

const incidentIcons: Record<string, typeof Flame> = {
  FIRE: Flame,
  CROWD_ANOMALY: Users,
  RESTRICTED_INTRUSION: ShieldAlert,
  MULTI_HAZARD: AlertOctagon,
}

function getIncidentLabel(type: string): string {
  switch (type) {
    case 'FIRE':
      return 'Fire Outbreak'
    case 'CROWD_ANOMALY':
      return 'Crowd Surge / Density Alert'
    case 'RESTRICTED_INTRUSION':
      return 'Restricted Zone Intrusion'
    case 'MULTI_HAZARD':
      return 'Multi-Hazard Emergency'
    default:
      return type.replace(/_/g, ' ')
  }
}

export default function IncidentFeed({ liveState }: IncidentFeedProps) {
  const incidents = liveState.incidents || []

  return (
    <div className="panel h-full flex flex-col min-h-0">
      <div className="panel-header">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-rakshak-muted flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Active Incidents
        </h3>
        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
            incidents.length > 0
              ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}
        >
          {incidents.length} {incidents.length === 1 ? 'EVENT' : 'EVENTS'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0">
        {incidents.length > 0 ? (
          incidents.map((incident, i) => {
            const Icon = incidentIcons[incident.incident_type] || AlertTriangle
            const sevClass =
              severityClasses[incident.severity as Severity] || severityClasses.LOW

            return (
              <div
                key={i}
                className={`p-2.5 rounded-lg border transition-all ${sevClass}`}
              >
                <div className="flex items-start gap-2">
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                        {incident.severity}
                      </span>
                      <span className="text-[10px] font-mono font-bold">
                        {Math.round(incident.confidence)}% CONF
                      </span>
                    </div>

                    <p className="text-xs font-bold mt-0.5 text-gray-100">
                      {getIncidentLabel(incident.incident_type)}
                    </p>

                    <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-gray-300">
                      <span>Location: <strong className="text-white">{incident.location}</strong></span>
                      <span className="bg-black/30 px-1.5 py-0.2 rounded uppercase text-[9px]">
                        {incident.status}
                      </span>
                    </div>

                    {incident.detected_factors && incident.detected_factors.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-white/10 text-[10px] text-gray-300">
                        {incident.detected_factors.map((factor, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span>•</span>
                            <span className="truncate">{factor}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-rakshak-muted">
            <CheckCircle className="w-8 h-8 text-emerald-400/60 mb-2" />
            <p className="text-xs font-medium text-gray-300">Station Normal</p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              No anomalies detected. Run a hazard scenario to observe live incidents.
            </p>
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-rakshak-border bg-rakshak-bg/40 text-[9px] font-mono text-rakshak-muted flex justify-between items-center">
        <span>Feed updates: Real-time</span>
        <span>Source: {liveState.data_source || 'SIMULATION'}</span>
      </div>
    </div>
  )
}
