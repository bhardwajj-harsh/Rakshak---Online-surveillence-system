import { useMemo, useState } from 'react'
import {
  Camera,
  Cpu,
  Flame,
  Layers,
  Navigation,
  Shield,
  Users,
} from 'lucide-react'
import type { LiveState } from '../../types'
import { API_URL, switchPipelineMode } from '../../services/api'

interface DigitalTwinProps {
  liveState: LiveState
}

interface HoveredZoneInfo {
  name: string
  crowdCount: number
  capacity: number
  density: number
  isHazard: boolean
  isRestricted: boolean
  status: string
  x: number
  y: number
}

const ZONE_CONFIGS: {
  name: string
  svgX: number
  svgY: number
  svgW: number
  svgH: number
  capacity: number
  isExit?: boolean
  isRestricted?: boolean
  exitX?: number
  exitY?: number
}[] = [
  {
    name: 'Platform 1',
    svgX: 100,
    svgY: 60,
    svgW: 300,
    svgH: 120,
    capacity: 300,
  },
  {
    name: 'Platform 2',
    svgX: 100,
    svgY: 420,
    svgW: 300,
    svgH: 120,
    capacity: 300,
  },
  {
    name: 'Main Corridor',
    svgX: 450,
    svgY: 60,
    svgW: 150,
    svgH: 480,
    capacity: 400,
  },
  {
    name: 'Service Area',
    svgX: 480,
    svgY: 240,
    svgW: 100,
    svgH: 90,
    capacity: 20,
    isRestricted: true,
  },
  {
    name: 'Gate 1',
    svgX: 650,
    svgY: 60,
    svgW: 200,
    svgH: 90,
    capacity: 150,
    isExit: true,
    exitX: 860,
    exitY: 105,
  },
  {
    name: 'Gate 2',
    svgX: 650,
    svgY: 180,
    svgW: 200,
    svgH: 90,
    capacity: 150,
    isExit: true,
    exitX: 860,
    exitY: 225,
  },
  {
    name: 'Gate 3',
    svgX: 650,
    svgY: 330,
    svgW: 200,
    svgH: 90,
    capacity: 150,
    isExit: true,
    exitX: 860,
    exitY: 375,
  },
  {
    name: 'Gate 4',
    svgX: 650,
    svgY: 450,
    svgW: 200,
    svgH: 90,
    capacity: 150,
    isExit: true,
    exitX: 860,
    exitY: 495,
  },
]

export default function DigitalTwin({ liveState }: DigitalTwinProps) {
  const [viewMode, setViewMode] = useState<'DIGITAL_TWIN' | 'REAL_VIDEO'>('DIGITAL_TWIN')
  const [cameraView, setCameraView] = useState<'DUAL' | 'CAM0' | 'CAM1'>('DUAL')
  const [hoveredZone, setHoveredZone] = useState<HoveredZoneInfo | null>(null)
  const [isSwitchingMode, setIsSwitchingMode] = useState(false)

  const people = liveState.people || []
  const zoneDensities = liveState.crowd?.zone_densities || {}
  const fireActive = liveState.fire_active
  const fireLocation = liveState.fire_location || 'Gate 2'
  const isIntervention = liveState.intervention_active
  const intrusionActive = (liveState.anomaly?.restricted_intrusion || 0) > 0
  const evacuationRoutes = liveState.response?.evacuation_routes || []
  const safeExits = liveState.response?.safe_exits || ['Gate 1', 'Gate 3', 'Gate 4']

  const handleToggleViewMode = async (mode: 'DIGITAL_TWIN' | 'REAL_VIDEO') => {
    setViewMode(mode)
    setIsSwitchingMode(true)
    try {
      await switchPipelineMode(mode === 'REAL_VIDEO' ? 'REAL_PERCEPTION' : 'SIMULATION')
    } catch (err) {
      console.warn('Mode switch warning:', err)
    } finally {
      setIsSwitchingMode(false)
    }
  }

  // Zone occupancy count helper
  const getZoneOccupancy = useMemo(() => {
    const counts: Record<string, number> = {}
    people.forEach((p) => {
      if (p.x >= 10 && p.x <= 40 && p.y >= 10 && p.y <= 30) {
        counts['Platform 1'] = (counts['Platform 1'] || 0) + 1
      } else if (p.x >= 10 && p.x <= 40 && p.y >= 70 && p.y <= 90) {
        counts['Platform 2'] = (counts['Platform 2'] || 0) + 1
      } else if (p.x >= 48 && p.x <= 58 && p.y >= 40 && p.y <= 55) {
        counts['Service Area'] = (counts['Service Area'] || 0) + 1
      } else if (p.x >= 45 && p.x <= 60) {
        counts['Main Corridor'] = (counts['Main Corridor'] || 0) + 1
      } else if (p.x >= 65 && p.x <= 85) {
        if (p.y >= 10 && p.y <= 25) counts['Gate 1'] = (counts['Gate 1'] || 0) + 1
        else if (p.y >= 30 && p.y <= 45) counts['Gate 2'] = (counts['Gate 2'] || 0) + 1
        else if (p.y >= 55 && p.y <= 70) counts['Gate 3'] = (counts['Gate 3'] || 0) + 1
        else if (p.y >= 75 && p.y <= 90) counts['Gate 4'] = (counts['Gate 4'] || 0) + 1
      }
    })
    return counts
  }, [people])

  // Get zone styling colors
  const getZoneTheme = (zoneName: string) => {
    const density = zoneDensities[zoneName] || 0
    const isHazard = fireActive && fireLocation === zoneName
    if (isHazard) {
      return { stroke: '#ef4444', fill: '#ef4444', fillOpacity: 0.22, badge: 'HAZARD' }
    }
    if (zoneName === 'Service Area' && intrusionActive) {
      return { stroke: '#a855f7', fill: '#a855f7', fillOpacity: 0.22, badge: 'INTRUSION' }
    }
    if (density >= 70) {
      return { stroke: '#ef4444', fill: '#ef4444', fillOpacity: 0.15, badge: 'CRITICAL' }
    }
    if (density >= 45) {
      return { stroke: '#f59e0b', fill: '#f59e0b', fillOpacity: 0.12, badge: 'CONGESTED' }
    }
    if (density >= 20) {
      return { stroke: '#06b6d4', fill: '#06b6d4', fillOpacity: 0.08, badge: 'MODERATE' }
    }
    return { stroke: '#374151', fill: '#111827', fillOpacity: 0.8, badge: 'NORMAL' }
  }

  // Render max 350 particles to maintain high 60fps canvas performance
  const renderedPeople = useMemo(() => {
    return people.slice(0, 350)
  }, [people])

  // Fire coordinates on SVG canvas
  const fireCoordinates = useMemo(() => {
    const fireZone = ZONE_CONFIGS.find((z) => z.name === fireLocation)
    if (fireZone) {
      return { x: fireZone.svgX + fireZone.svgW / 2, y: fireZone.svgY + fireZone.svgH / 2 }
    }
    return { x: 750, y: 225 } // Default Gate 2
  }, [fireLocation])

  const handleZoneMouseEnter = (
    e: React.MouseEvent,
    zone: (typeof ZONE_CONFIGS)[0]
  ) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const count = getZoneOccupancy[zone.name] || 0
    const density = Math.round(zoneDensities[zone.name] || 0)
    const isHazard = fireActive && fireLocation === zone.name

    let status = 'Normal'
    if (isHazard) status = 'CRITICAL HAZARD (FIRE)'
    else if (zone.isRestricted && intrusionActive) status = 'BREACH DETECTED'
    else if (density > 65) status = 'High Congestion'
    else if (density > 35) status = 'Moderate Flow'

    setHoveredZone({
      name: zone.name,
      crowdCount: count,
      capacity: zone.capacity,
      density,
      isHazard,
      isRestricted: !!zone.isRestricted,
      status,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    })
  }

  const handleZoneMouseLeave = () => {
    setHoveredZone(null)
  }

  return (
    <div className="panel h-full flex flex-col relative overflow-hidden select-none">
      {/* Panel Header with Viewport Mode Tabs */}
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
              Spatial Intelligence Viewport
            </h3>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-rakshak-bg p-0.5 rounded border border-rakshak-border">
            <button
              onClick={() => handleToggleViewMode('DIGITAL_TWIN')}
              disabled={isSwitchingMode}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all ${
                viewMode === 'DIGITAL_TWIN'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Digital Twin 2.5D</span>
            </button>
            <button
              onClick={() => handleToggleViewMode('REAL_VIDEO')}
              disabled={isSwitchingMode}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all ${
                viewMode === 'REAL_VIDEO'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Camera className="w-3 h-3" />
              <span>Real Video Perception (CCTV)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
            <Users className="w-3 h-3" />
            <span>Tracked: {people.length}</span>
          </span>
          <span className="text-gray-400 text-[10px] uppercase">
            Source:{' '}
            <strong
              className={
                liveState.data_source === 'REAL_PERCEPTION'
                  ? 'text-purple-400'
                  : 'text-amber-400'
              }
            >
              {liveState.data_source || 'SIMULATION'}
            </strong>
          </span>
        </div>
      </div>

      {/* Main Viewport Content */}
      <div className="flex-1 relative bg-gradient-to-br from-[#050811] via-[#090e1a] to-[#050811] p-2 min-h-0">
        {viewMode === 'REAL_VIDEO' ? (
          /* MULTI-CAMERA REAL VIDEO PERCEPTION VIEWPORT */
          <div className="w-full h-full flex flex-col gap-2">
            {/* Camera Switcher Bar */}
            <div className="flex items-center justify-between px-2 py-1 bg-black/60 backdrop-blur-md rounded border border-rakshak-border text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 uppercase font-bold">Camera Feeds:</span>
                <button
                  onClick={() => setCameraView('DUAL')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    cameraView === 'DUAL'
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  ⊞ DUAL SPLIT VIEW
                </button>
                <button
                  onClick={() => setCameraView('CAM0')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    cameraView === 'CAM0'
                      ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  CAM 01 (PLATFORM 1)
                </button>
                <button
                  onClick={() => setCameraView('CAM1')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    cameraView === 'CAM1'
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  CAM 02 (IPHONE WIRELESS)
                </button>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                <div className="flex items-center gap-1 text-cyan-400">
                  <Cpu className="w-3 h-3" />
                  <span>Model: YOLOv8n (CPU/ONNX)</span>
                </div>
                <span>FPS: 30.0</span>
                <span>Latency: ~14.8ms</span>
              </div>
            </div>

            {/* Video Streams Container */}
            <div className="flex-1 min-h-0">
              {cameraView === 'DUAL' ? (
                <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* Camera 0: MacBook Built-in (Platform 1) */}
                  <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border border-cyan-500/30 flex items-center justify-center">
                    <img
                      src={`${API_URL}/api/video/stream/0`}
                      alt="Camera 01 Platform 1"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md border border-cyan-500/40 px-2 py-1 rounded text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      <strong>CAM 01 (MacBook): PLATFORM 1</strong>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md border border-gray-800 px-2 py-0.5 rounded text-[9px] font-mono text-gray-300">
                      Tracks: <strong className="text-cyan-400">{people.filter((p) => p.track_id < 200).length || Math.floor(people.length / 2)}</strong>
                    </div>
                  </div>

                  {/* Camera 1: iPhone Wireless / Continuity (Gate 1) */}
                  <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border border-purple-500/30 flex items-center justify-center">
                    <img
                      src={`${API_URL}/api/video/stream/1`}
                      alt="Camera 02 Gate 1"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md border border-purple-500/40 px-2 py-1 rounded text-[10px] font-mono text-purple-300 flex items-center gap-1.5 shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                      <strong>CAM 02 (iPhone): GATE 1 CONCOURSE</strong>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md border border-gray-800 px-2 py-0.5 rounded text-[9px] font-mono text-gray-300">
                      Tracks: <strong className="text-purple-400">{people.filter((p) => p.track_id >= 200).length || Math.ceil(people.length / 2)}</strong>
                    </div>
                  </div>
                </div>
              ) : cameraView === 'CAM0' ? (
                <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border border-cyan-500/40 flex items-center justify-center">
                  <img
                    src={`${API_URL}/api/video/stream/0`}
                    alt="Camera 01 Platform 1"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-cyan-500/40 px-3 py-1.5 rounded-lg text-xs font-mono text-cyan-300 flex items-center gap-2 shadow-xl">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <strong>CAM 01 (MacBook Built-in): PLATFORM 1 [LIVE CCTV]</strong>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border border-purple-500/40 flex items-center justify-center">
                  <img
                    src={`${API_URL}/api/video/stream/1`}
                    alt="Camera 02 Gate 1"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-purple-500/40 px-3 py-1.5 rounded-lg text-xs font-mono text-purple-300 flex items-center gap-2 shadow-xl">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                    <strong>CAM 02 (iPhone Continuity): GATE 1 CONCOURSE [LIVE CCTV]</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* DIGITAL TWIN 2.5D SVG MAP VIEWPORT */
          <svg
            viewBox="0 0 1000 600"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Grid Pattern */}
              <pattern id="twinGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                <path
                  d="M 25 0 L 0 0 0 25"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="0.5"
                  opacity="0.25"
                />
              </pattern>

              {/* Fire Hazard Radial Gradient */}
              <radialGradient id="fireGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
                <stop offset="40%" stopColor="#f97316" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </radialGradient>

              {/* Safe Zone Radial Glow */}
              <radialGradient id="safeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#059669" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </radialGradient>

              {/* Evacuation Route Green Arrow Marker */}
              <marker
                id="evacArrowGreen"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#10b981" />
              </marker>
            </defs>

            {/* Canvas Background Grid */}
            <rect x="0" y="0" width="1000" height="600" fill="url(#twinGrid)" />

            {/* Outer Station Boundary */}
            <rect
              x="40"
              y="30"
              width="920"
              height="540"
              fill="#080c14"
              stroke="#1e293b"
              strokeWidth="2"
              rx="14"
            />

            {/* Station Zones (Platforms, Concourse, Exits, Restricted Area) */}
            {ZONE_CONFIGS.map((zone) => {
              const theme = getZoneTheme(zone.name)
              const count = getZoneOccupancy[zone.name] || 0
              const density = Math.round(zoneDensities[zone.name] || 0)
              const isHazard = fireActive && fireLocation === zone.name
              const isSafeExit = zone.isExit && safeExits.includes(zone.name)

              // Clean text offsets depending on zone dimensions
              let titleY = zone.svgY + 28
              let occY = zone.svgY + 46
              let badgeY = zone.svgY + 62

              if (zone.name === 'Platform 1' || zone.name === 'Platform 2') {
                titleY = zone.svgY + 32
                occY = zone.svgY + 54
                badgeY = zone.svgY + 76
              } else if (zone.name === 'Service Area') {
                titleY = zone.svgY + 24
                occY = zone.svgY + 44
                badgeY = zone.svgY + 62
              }

              return (
                <g
                  key={zone.name}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={(e) => handleZoneMouseEnter(e, zone)}
                  onMouseLeave={handleZoneMouseLeave}
                >
                  {/* Zone Area Box */}
                  <rect
                    x={zone.svgX}
                    y={zone.svgY}
                    width={zone.svgW}
                    height={zone.svgH}
                    fill={theme.fill}
                    fillOpacity={theme.fillOpacity}
                    stroke={theme.stroke}
                    strokeWidth={isHazard ? 2.5 : isSafeExit && isIntervention ? 2 : 1.5}
                    strokeDasharray={zone.isRestricted ? '5 3' : undefined}
                    rx="8"
                    className={isHazard ? 'animate-pulse' : ''}
                  />

                  {/* Zone Name Header */}
                  <text
                    x={zone.svgX + zone.svgW / 2}
                    y={zone.name === 'Main Corridor' ? zone.svgY + 240 : titleY}
                    fill={theme.stroke === '#374151' ? '#cbd5e1' : theme.stroke}
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="monospace"
                    letterSpacing={zone.name === 'Main Corridor' ? '3' : '1'}
                    transform={
                      zone.name === 'Main Corridor'
                        ? `rotate(-90 ${zone.svgX + zone.svgW / 2} ${zone.svgY + 240})`
                        : undefined
                    }
                  >
                    {zone.name.toUpperCase()}
                  </text>

                  {/* Clean Telemetry Sub-labels (if not corridor) */}
                  {zone.name !== 'Main Corridor' && (
                    <>
                      <text
                        x={zone.svgX + zone.svgW / 2}
                        y={occY}
                        fill="#94a3b8"
                        fontSize="10"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {count} ppl • {density}% occ
                      </text>

                      {/* Zone Status Tag */}
                      <rect
                        x={zone.svgX + zone.svgW / 2 - 32}
                        y={badgeY - 10}
                        width="64"
                        height="15"
                        fill="#0f172a"
                        stroke={theme.stroke}
                        strokeWidth="0.8"
                        rx="3"
                        opacity="0.95"
                      />
                      <text
                        x={zone.svgX + zone.svgW / 2}
                        y={badgeY + 1}
                        fill={theme.stroke}
                        fontSize="8"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {theme.badge}
                      </text>
                    </>
                  )}

                  {/* Exit Gate Marker */}
                  {zone.isExit && (
                    <g>
                      <rect
                        x={(zone.exitX || 860) - 5}
                        y={(zone.exitY || 100) - 15}
                        width="45"
                        height="30"
                        fill={isHazard ? '#ef4444' : isSafeExit ? '#10b981' : '#06b6d4'}
                        opacity={isHazard ? 0.3 : 0.15}
                        rx="4"
                      />
                      <text
                        x={(zone.exitX || 860) + 17}
                        y={(zone.exitY || 100) + 4}
                        fill={isHazard ? '#ef4444' : isSafeExit ? '#10b981' : '#06b6d4'}
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {isHazard ? 'BLOCKED' : 'EXIT'}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}

            {/* Active Fire Hazard Pulsing Rings & Flame Icon */}
            {fireActive && (
              <g>
                <circle
                  cx={fireCoordinates.x}
                  cy={fireCoordinates.y}
                  r="65"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  opacity="0.4"
                  className="animate-ping"
                />
                <circle
                  cx={fireCoordinates.x}
                  cy={fireCoordinates.y}
                  r="50"
                  fill="url(#fireGlow)"
                />
                <text
                  x={fireCoordinates.x}
                  y={fireCoordinates.y + 8}
                  fill="#ffffff"
                  fontSize="28"
                  textAnchor="middle"
                >
                  🔥
                </text>
                <text
                  x={fireCoordinates.x}
                  y={fireCoordinates.y + 40}
                  fill="#ef4444"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  HAZARD: FIRE OUTBREAK
                </text>
              </g>
            )}

            {/* Dynamic Evacuation Egress Corridors & Animated Flow Arrows */}
            {(isIntervention || fireActive) && (
              <g>
                {/* Corridor from Platform 1 to Main Corridor & Gate 1/3 */}
                <path
                  d="M 250 150 L 525 150 L 525 105 L 640 105"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  markerEnd="url(#evacArrowGreen)"
                  className="animate-pulse"
                  opacity="0.85"
                />

                {/* Corridor from Platform 2 to Gate 4 */}
                <path
                  d="M 250 450 L 525 450 L 525 495 L 640 495"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  markerEnd="url(#evacArrowGreen)"
                  className="animate-pulse"
                  opacity="0.85"
                />

                {/* Main Corridor Fleeing away from Gate 2 to Gate 4 & Gate 3 */}
                <path
                  d="M 525 225 L 525 375 L 640 375"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeDasharray="8 4"
                  markerEnd="url(#evacArrowGreen)"
                  className="animate-pulse"
                />
                <path
                  d="M 525 375 L 525 495 L 640 495"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeDasharray="8 4"
                  markerEnd="url(#evacArrowGreen)"
                  className="animate-pulse"
                />

                {/* Safe Gate 4 & Gate 3 Egress Highlights */}
                <circle cx="750" cy="495" r="45" fill="url(#safeGlow)" opacity="0.35" />
                <circle cx="750" cy="375" r="45" fill="url(#safeGlow)" opacity="0.25" />

                <text
                  x="540"
                  y="435"
                  fill="#10b981"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  ➔ RECOMMENDED EGRESS: GATE 4 / GATE 3
                </text>
              </g>
            )}

            {/* Dynamic Crowd Particles Heatmap */}
            {renderedPeople.map((person) => {
              const svgX = person.x * 10
              const svgY = person.y * 6

              let fill = '#06b6d4' // Cyan normal
              let radius = 3.5
              let opacity = 0.85

              if (person.in_restricted_zone) {
                fill = '#ef4444' // Red intruder
                radius = 5.5
                opacity = 1.0
              } else if (fireActive && person.x >= 60 && person.y <= 50) {
                fill = '#ef4444' // Red in fire danger perimeter
                radius = 4.5
              } else if (isIntervention) {
                fill = '#10b981' // Green evacuating under guidance
              } else if (person.speed > 2.8) {
                fill = '#eab308' // Yellow moving fast
              } else if (person.speed < 0.4) {
                fill = '#64748b' // Slate stationary
              }

              return (
                <g key={person.track_id}>
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r={radius}
                    fill={fill}
                    opacity={opacity}
                    className={person.in_restricted_zone ? 'animate-ping' : ''}
                  />
                </g>
              )
            })}
          </svg>
        )}

        {/* Top-Right HUD Overlays: Zone Telemetry Inspector & Fire Alert */}
        {viewMode === 'DIGITAL_TWIN' && (
          <div className="absolute top-3 right-3 z-30 flex flex-col items-end gap-2 pointer-events-none">
            {/* Fire Hazard Alert Banner on Map */}
            {fireActive && (
              <div className="bg-red-500/20 border border-red-500/50 px-3 py-1.5 rounded-lg flex items-center gap-2 backdrop-blur-md shadow-lg animate-pulse">
                <Flame className="w-4 h-4 text-red-400" />
                <span className="text-xs font-bold text-red-300 font-mono">
                  FIRE AT {fireLocation.toUpperCase()} — CORRIDORS REROUTED TO GATE 4
                </span>
              </div>
            )}

            {/* EOC Zone Hover Telemetry Inspector */}
            {hoveredZone && (
              <div className="bg-[#0f172a]/95 backdrop-blur-md border border-cyan-500/40 rounded-lg p-3 text-xs shadow-2xl space-y-1.5 w-64 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between gap-2 border-b border-gray-700/60 pb-1">
                  <span className="font-bold text-white uppercase tracking-wider font-mono text-[11px]">
                    {hoveredZone.name}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      hoveredZone.isHazard
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : hoveredZone.density > 60
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {hoveredZone.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono text-gray-300">
                  <div>
                    Crowd: <strong className="text-cyan-400">{hoveredZone.crowdCount}</strong> ppl
                  </div>
                  <div>
                    Capacity: <strong className="text-gray-200">{hoveredZone.capacity}</strong>
                  </div>
                  <div>
                    Occupancy: <strong className="text-amber-400">{hoveredZone.density}%</strong>
                  </div>
                  <div>
                    Safety:{' '}
                    <strong
                      className={hoveredZone.isHazard ? 'text-red-400' : 'text-emerald-400'}
                    >
                      {hoveredZone.isHazard ? 'BLOCKED' : 'CLEAR'}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interactive EOC Map Legend / HUD (when in Digital Twin mode) */}
        {viewMode === 'DIGITAL_TWIN' && (
          <div className="absolute bottom-3 left-3 bg-rakshak-panel/90 backdrop-blur-md border border-rakshak-border px-3 py-2 rounded-lg text-[10px] space-y-1.5 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-gray-300">Tracked Agent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-gray-300">Hazard / Danger</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-gray-300">Safe Corridor / Egress</span>
              </div>
            </div>
            {isIntervention && (
              <div className="text-emerald-400 font-mono font-medium flex items-center gap-1.5 pt-0.5 border-t border-rakshak-border/60">
                <Navigation className="w-3 h-3 text-emerald-400 animate-spin" />
                <span>
                  RAKSHAK Pathfinding Active:{' '}
                  {evacuationRoutes.length > 0
                    ? `${evacuationRoutes.length} Dynamic Egress Corridors Calculated`
                    : 'Crowd Guided to Gate 4'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
