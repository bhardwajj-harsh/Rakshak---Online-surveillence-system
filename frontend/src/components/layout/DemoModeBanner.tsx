import { AlertTriangle } from 'lucide-react'

export default function DemoModeBanner() {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-center gap-2">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
      <span className="text-xs font-medium text-amber-400 tracking-wide">
        DEMO MODE — SIMULATED ENVIRONMENT — NOT LIVE EMERGENCY DATA
      </span>
      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
    </div>
  )
}
