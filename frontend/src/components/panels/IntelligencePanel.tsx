import { useState } from 'react'
import {
  Activity,
  Brain,
  CheckCircle2,
  Clock,
  FileText,
  Gauge,
  Shield,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Zap,
} from 'lucide-react'
import type { LiveState, Severity } from '../../types'
import { generateAuditReport } from '../../services/api'
import AuditReportModal from './AuditReportModal'

interface IntelligencePanelProps {
  liveState: LiveState
}

const severityConfig: Record<
  Severity,
  { label: string; bg: string; text: string; border: string; glow: string }
> = {
  CRITICAL: {
    label: 'CRITICAL',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/40',
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]',
  },
  HIGH: {
    label: 'HIGH',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/40',
    glow: 'shadow-[0_0_12px_rgba(249,115,22,0.25)]',
  },
  MEDIUM: {
    label: 'MEDIUM',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    glow: 'shadow-[0_0_10px_rgba(245,158,11,0.2)]',
  },
  LOW: {
    label: 'LOW',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    glow: 'shadow-[0_0_10px_rgba(16,185,129,0.2)]',
  },
}

export default function IntelligencePanel({ liveState }: IntelligencePanelProps) {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  const risk = liveState.risk || {
    overall_score: 0,
    severity: 'LOW',
    contributing_factors: ['System standby'],
    confidence: 0.9,
    dominant_cause: 'Normal Baseline Operating Parameters',
    projected_risk_10s: 0,
  }

  const factors = risk.factors || {
    density_anomaly: Math.round(liveState.crowd?.density_score || 0),
    kinetic_panic: Math.round(liveState.crowd?.movement_variance || 0),
    bottleneck_congestion: Math.round(liveState.crowd?.congestion_score || 0),
    hazard_proximity: liveState.fire_active ? 85 : 0,
  }

  const predictions = liveState.predictions || []
  const response = liveState.response
  const riskHistory = liveState.risk_history || []

  const severityStyle = severityConfig[risk.severity as Severity] || severityConfig.LOW

  const riskTrend =
    riskHistory.length >= 4
      ? riskHistory[riskHistory.length - 1] - riskHistory[riskHistory.length - 4]
      : 0

  const handleOpenReportModal = async () => {
    setIsGeneratingReport(true)
    setIsReportModalOpen(true)
    try {
      const data = await generateAuditReport()
      setReportData(data)
    } catch (err) {
      console.warn('Failed to generate audit report:', err)
    } finally {
      setIsGeneratingReport(false)
    }
  }

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto pr-0.5 select-none">
      {/* 1. Main Risk Score Header Card */}
      <div className={`panel p-3.5 ${severityStyle.glow} transition-all duration-300`}>
        <div className="flex items-center justify-between border-b border-rakshak-border pb-2 mb-3">
          <div className="flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
              Risk Assessment
            </h3>
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            Confidence:{' '}
            <strong className="text-cyan-400">
              {Math.round((risk.confidence || 0.9) * 100)}%
            </strong>
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-mono font-black ${severityStyle.text}`}>
                {Math.round(risk.overall_score)}
              </span>
              <span className="text-sm font-mono text-rakshak-muted">/ 100</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${severityStyle.bg} ${severityStyle.text} border ${severityStyle.border}`}
              >
                {severityStyle.label}
              </span>
              {riskTrend !== 0 && (
                <span
                  className={`flex items-center text-[10px] font-mono font-medium ${
                    riskTrend > 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {riskTrend > 0 ? (
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                  )}
                  {riskTrend > 0 ? `+${riskTrend.toFixed(1)}` : riskTrend.toFixed(1)}/min
                </span>
              )}
            </div>
          </div>

          {/* 10s Projected Risk Gauge */}
          <div className="text-right">
            <div className="text-[9px] font-mono text-gray-400 uppercase">10s Projected Risk</div>
            <div className="text-xl font-mono font-bold text-orange-400">
              {risk.projected_risk_10s
                ? Math.max(0, Math.min(100, Math.round(risk.projected_risk_10s)))
                : Math.round(risk.overall_score)}
              <span className="text-xs font-normal text-gray-500"> / 100</span>
            </div>
            <div className="text-[9px] font-mono text-gray-400 flex items-center justify-end gap-1 mt-0.5">
              <Activity className="w-2.5 h-2.5 text-cyan-400" />
              <span>Trend Extrapolated</span>
            </div>
          </div>
        </div>

        {/* Dominant Root Cause Callout */}
        <div className="mt-3 pt-2.5 border-t border-rakshak-border flex items-start gap-2 bg-black/30 p-2 rounded border border-gray-800">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs font-mono">
            <span className="text-gray-400 text-[10px] uppercase font-bold block">
              Dominant Incident Cause:
            </span>
            <span className="text-amber-300 font-semibold text-[11px]">
              {risk.dominant_cause || 'Normal Baseline Operating Parameters'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Explainable AI (XAI) Multi-Factor Decomposition */}
      <div className="panel p-3">
        <div className="panel-header -mx-3 -mt-3 mb-2.5 px-3 py-2 flex items-center justify-between">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Gauge className="w-3 h-3 text-cyan-400" />
            Explainable AI Multi-Factor Decomposition
          </h4>
          <span className="text-[9px] font-mono text-cyan-400">Σ(w·F) Formulation</span>
        </div>

        <div className="space-y-2 text-[10px] font-mono">
          {/* Factor 1: Density Anomaly */}
          <div>
            <div className="flex justify-between text-gray-300 mb-0.5">
              <span className="flex items-center gap-1">
                <span>Density Anomaly</span>
                <span className="text-gray-500 text-[9px]">(w₁=0.25)</span>
              </span>
              <span className="font-bold text-cyan-400">
                {Math.max(0, Math.min(100, Math.round(factors.density_anomaly || 0)))}%
              </span>
            </div>
            <div className="w-full bg-rakshak-bg h-1.5 rounded overflow-hidden border border-gray-800">
              <div
                className="bg-cyan-500 h-full transition-all duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, factors.density_anomaly || 0))}%`,
                }}
              />
            </div>
          </div>

          {/* Factor 2: Kinetic Panic */}
          <div>
            <div className="flex justify-between text-gray-300 mb-0.5">
              <span className="flex items-center gap-1">
                <span>Kinetic Panic / Entropy</span>
                <span className="text-gray-500 text-[9px]">(w₂=0.25)</span>
              </span>
              <span className="font-bold text-purple-400">
                {Math.max(0, Math.min(100, Math.round(factors.kinetic_panic || 0)))}%
              </span>
            </div>
            <div className="w-full bg-rakshak-bg h-1.5 rounded overflow-hidden border border-gray-800">
              <div
                className="bg-purple-500 h-full transition-all duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, factors.kinetic_panic || 0))}%`,
                }}
              />
            </div>
          </div>

          {/* Factor 3: Bottleneck Choke Index */}
          <div>
            <div className="flex justify-between text-gray-300 mb-0.5">
              <span className="flex items-center gap-1">
                <span>Bottleneck Choke Index</span>
                <span className="text-gray-500 text-[9px]">(w₃=0.20)</span>
              </span>
              <span className="font-bold text-amber-400">
                {Math.max(0, Math.min(100, Math.round(factors.bottleneck_congestion || 0)))}%
              </span>
            </div>
            <div className="w-full bg-rakshak-bg h-1.5 rounded overflow-hidden border border-gray-800">
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, factors.bottleneck_congestion || 0))}%`,
                }}
              />
            </div>
          </div>

          {/* Factor 4: Hazard Proximity Decay */}
          <div>
            <div className="flex justify-between text-gray-300 mb-0.5">
              <span className="flex items-center gap-1">
                <span>Hazard Proximity Decay</span>
                <span className="text-gray-500 text-[9px]">(w₄=0.30)</span>
              </span>
              <span
                className={`font-bold ${
                  (factors.hazard_proximity || 0) > 30 ? 'text-red-400' : 'text-gray-400'
                }`}
              >
                {Math.max(0, Math.min(100, Math.round(factors.hazard_proximity || 0)))}%
              </span>
            </div>
            <div className="w-full bg-rakshak-bg h-1.5 rounded overflow-hidden border border-gray-800">
              <div
                className="bg-red-500 h-full transition-all duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, factors.hazard_proximity || 0))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Active Incident Signals */}
      <div className="panel p-3">
        <div className="panel-header -mx-3 -mt-3 mb-2 px-3 py-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
            Active Incident Signals
          </h4>
        </div>
        <ul className="space-y-1.5 text-xs">
          {risk.contributing_factors?.length ? (
            risk.contributing_factors.map((factor, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                <span className="text-[11px] leading-tight">{factor}</span>
              </li>
            ))
          ) : (
            <li className="text-[11px] text-rakshak-muted italic">Operating normally.</li>
          )}
        </ul>
      </div>

      {/* 4. Short-Term Trend Predictions (Strictly Clamped) */}
      <div className="panel p-3">
        <div className="panel-header -mx-3 -mt-3 mb-2 px-3 py-2 flex items-center justify-between">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-cyan-400" />
            Trend Predictions
          </h4>
          <span className="text-[9px] font-mono text-rakshak-muted">AI Projection</span>
        </div>

        {predictions.length > 0 ? (
          <div className="space-y-1.5">
            {predictions.map((pred, i) => {
              const clampedProb = Math.max(0, Math.min(100, Math.round(pred.probability)))
              return (
                <div
                  key={i}
                  className="p-2 rounded bg-rakshak-bg/70 border border-rakshak-border text-xs font-mono"
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[10px] font-bold text-orange-400 uppercase">
                      {pred.event_type}
                    </span>
                    <span className="text-[10px] bg-orange-500/10 text-orange-300 border border-orange-500/30 px-1.5 rounded font-bold">
                      Prob: {clampedProb}%
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300">{pred.explanation}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-[11px] text-rakshak-muted italic py-0.5">
            No critical escalations projected at current trend.
          </p>
        )}
      </div>

      {/* 5. Recommended Emergency Response Plan */}
      <div className="panel p-3 flex-1 flex flex-col min-h-0">
        <div className="panel-header -mx-3 -mt-3 mb-2 px-3 py-2 flex items-center justify-between">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-emerald-400" />
            Response Recommendations
          </h4>
          {response?.requires_human_approval && (
            <span className="flex items-center gap-1 text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
              <UserCheck className="w-2.5 h-2.5" />
              Human In The Loop
            </span>
          )}
        </div>

        {response?.actions && response.actions.length > 0 ? (
          <div className="space-y-1.5 overflow-y-auto flex-1 mb-2">
            {response.actions.map((act, i) => (
              <div
                key={i}
                className="p-2 rounded bg-cyan-500/5 border border-cyan-500/20 text-xs"
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="font-semibold text-cyan-300 text-[11px]">
                    #{act.priority} {act.action}
                  </p>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{act.reason}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-rakshak-muted italic py-1 mb-2">
            Standard monitoring — all systems normal.
          </p>
        )}

        {/* Post-Incident Audit Report Generation CTA */}
        <button
          onClick={handleOpenReportModal}
          className="w-full py-2 bg-gradient-to-r from-cyan-600/20 via-purple-600/20 to-cyan-600/20 hover:from-cyan-600/30 hover:to-purple-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>GENERATE POST-INCIDENT AUDIT REPORT</span>
        </button>
      </div>

      {/* Post-Incident Audit Report Modal Component */}
      <AuditReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportData={reportData}
        isLoading={isGeneratingReport}
      />
    </div>
  )
}
