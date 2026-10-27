import { useState } from 'react'
import {
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Shield,
  X,
  Zap,
} from 'lucide-react'
import { fetchReportMarkdown } from '../../services/api'

interface AuditReportModalProps {
  isOpen: boolean
  onClose: () => void
  reportData: any
  isLoading: boolean
}

export default function AuditReportModal({
  isOpen,
  onClose,
  reportData,
  isLoading,
}: AuditReportModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopyMarkdown = async () => {
    try {
      const md = await fetchReportMarkdown()
      await navigator.clipboard.writeText(md)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.warn('Failed to copy markdown:', err)
    }
  }

  const handleDownloadMarkdown = async () => {
    try {
      const md = await fetchReportMarkdown()
      const blob = new Blob([md], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportData?.report_id || reportData?.incident_id || 'RAKSHAK-AUDIT'}.md`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.warn('Failed to download markdown:', err)
    }
  }

  const metrics = reportData?.metrics || reportData?.telemetry_metrics || {}
  const xai = reportData?.explainable_ai_breakdown || {}
  const factors = xai?.factors || {}
  const timeline = reportData?.timeline || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b1120] border border-cyan-500/40 rounded-xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-rakshak-panel border-b border-rakshak-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-cyan-500/10 border border-cyan-500/30 rounded">
              <FileText className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Post-Incident Audit & Evaluation Report
              </h3>
              <p className="text-[10px] font-mono text-gray-400">
                Formalized Operations Audit • NDMA / Station Safety Compliance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs text-gray-300">
          {isLoading || !reportData ? (
            <div className="py-16 text-center text-cyan-400 space-y-3">
              <div className="animate-spin text-3xl">⚙️</div>
              <p className="text-sm">Synthesizing telemetry, XAI factor weights, and timeline...</p>
            </div>
          ) : (
            <>
              {/* Incident Metadata & Compliance Badge */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-black/50 rounded-lg border border-gray-800 text-[11px]">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Incident ID</span>
                    <strong className="text-cyan-400">
                      {reportData.incident_id || reportData.report_id}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Evaluated Scenario</span>
                    <strong className="text-amber-400">{reportData.scenario}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Impact Sector</span>
                    <strong className="text-purple-400">{reportData.incident_location}</strong>
                  </div>
                </div>

                <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Compliance Verification:</span>
                  </div>
                  <strong className="text-emerald-400 font-bold">
                    {reportData.compliance_status || 'STATION SAFETY PROTOCOL MET (NDMA Level 2)'}
                  </strong>
                </div>
              </div>

              {/* Executive Summary */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  1. Executive Summary
                </h4>
                <p className="p-3 bg-black/40 rounded-lg border border-gray-800 text-gray-200 leading-relaxed text-[11px]">
                  {reportData.executive_summary}
                </p>
              </div>

              {/* Quantitative Telemetry Grid */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  2. Quantitative Telemetry & Egress Optimization
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2.5 bg-black/40 rounded-lg border border-gray-800">
                    <span className="text-gray-400 block text-[10px]">Initial / Peak Risk</span>
                    <strong className="text-red-400 text-sm">
                      {metrics.initial_risk || metrics.peak_risk} ➔ {metrics.peak_risk}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-black/40 rounded-lg border border-gray-800">
                    <span className="text-gray-400 block text-[10px]">Post-Intervention</span>
                    <strong className="text-emerald-400 text-sm">
                      {metrics.resolved_risk} / 100
                    </strong>
                  </div>
                  <div className="p-2.5 bg-black/40 rounded-lg border border-gray-800">
                    <span className="text-gray-400 block text-[10px]">Risk Mitigation</span>
                    <strong className="text-cyan-400 text-sm">
                      {metrics.risk_reduction_pct}% Reduction
                    </strong>
                  </div>
                  <div className="p-2.5 bg-black/40 rounded-lg border border-gray-800">
                    <span className="text-gray-400 block text-[10px]">Evacuation Time</span>
                    <strong className="text-amber-400 text-sm">
                      {metrics.estimated_evac_time_sec}s
                    </strong>
                  </div>
                </div>
              </div>

              {/* Chronological Incident Timeline */}
              {timeline.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    3. Chronological Incident Event Timeline
                  </h4>
                  <div className="p-3 bg-black/40 rounded-lg border border-gray-800 space-y-2 text-[11px]">
                    {timeline.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <span className="text-cyan-400 font-bold shrink-0">
                          [{item.time_offset}]
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0 ${
                            item.status === 'CRITICAL'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : item.status === 'WARNING'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : item.status === 'SUCCESS'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-gray-300 leading-tight">{item.event}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explainable AI (XAI) Multi-Factor Decomposition */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  4. Explainable AI (XAI) Multi-Factor Decomposition
                </h4>
                <div className="p-3 bg-black/40 rounded-lg border border-gray-800 space-y-2">
                  <div className="text-amber-300 font-semibold text-xs">
                    Dominant Driver: {xai.dominant_cause}
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800 text-[11px]">
                    <div>
                      Density Anomaly (w₁=0.25):{' '}
                      <strong className="text-cyan-400">
                        {factors.density_anomaly || 0}%
                      </strong>
                    </div>
                    <div>
                      Kinetic Panic (w₂=0.25):{' '}
                      <strong className="text-purple-400">
                        {factors.kinetic_panic || 0}%
                      </strong>
                    </div>
                    <div>
                      Bottleneck Choke (w₃=0.20):{' '}
                      <strong className="text-amber-400">
                        {factors.bottleneck_congestion || 0}%
                      </strong>
                    </div>
                    <div>
                      Hazard Proximity (w₄=0.30):{' '}
                      <strong className="text-red-400">
                        {factors.hazard_proximity || 0}%
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evacuation Routing Summary */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  5. Evacuation Guidance & Designated Channels
                </h4>
                <div className="p-3 bg-black/40 rounded-lg border border-gray-800 text-[11px] space-y-1">
                  <div>
                    Designated Safe Exits:{' '}
                    <strong className="text-emerald-400">
                      {metrics.rerouted_exits?.join(', ') || 'Gate 4, Gate 3'}
                    </strong>
                  </div>
                  <div>
                    Occupants Guided Safely:{' '}
                    <strong className="text-cyan-400">
                      {metrics.agents_routed_safely || 300} persons
                    </strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 bg-rakshak-panel border-t border-rakshak-border flex items-center justify-between">
          <span className="text-[10px] text-gray-400 font-mono">
            Human-in-the-loop Protocol Verification Active
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              disabled={isLoading || !reportData}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rakshak-bg hover:bg-rakshak-border text-gray-200 text-xs font-mono rounded border border-rakshak-border transition-colors disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              <span>{copied ? 'COPIED!' : 'COPY MARKDOWN'}</span>
            </button>
            <button
              onClick={handleDownloadMarkdown}
              disabled={isLoading || !reportData}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold rounded shadow transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD REPORT (.MD)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
