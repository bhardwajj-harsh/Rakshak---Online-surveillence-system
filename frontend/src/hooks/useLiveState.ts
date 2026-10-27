import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConnectionStatus, LiveState } from '../types'

export const INITIAL_LIVE_STATE: LiveState = {
  tick: 0,
  timestamp: new Date().toISOString(),
  scenario: 'NORMAL',
  running: false,
  data_source: 'SIMULATION',
  people: [],
  detections: [],
  crowd: {
    total_people: 0,
    density_score: 0,
    average_speed: 0,
    movement_variance: 0,
    dominant_direction: 0,
    density_change_rate: 0,
    congestion_score: 0,
    zone_densities: {},
  },
  anomaly: {
    overall: 0,
    crowd_anomaly: 0,
    movement_anomaly: 0,
    density_change: 0,
    fire_probability: 0,
    restricted_intrusion: 0,
  },
  risk: {
    overall_score: 0,
    severity: 'LOW',
    contributing_factors: ['System standby — waiting for simulation tick'],
    confidence: 0,
    timestamp: new Date().toISOString(),
  },
  predictions: [],
  incidents: [],
  response: null,
  risk_history: [],
  fire_active: false,
  fire_location: null,
  intervention_active: false,
}

const RECONNECT_DELAYS_MS = [1000, 2000, 5000]

function getWsUrl(): string {
  const envUrl = import.meta.env.VITE_WS_URL
  if (envUrl) return envUrl
  const loc = window.location
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = loc.hostname || 'localhost'
  return `${protocol}//${host}:8000/ws/live`
}

export function useLiveState() {
  const [state, setState] = useState<LiveState>(INITIAL_LIVE_STATE)
  const [status, setStatus] = useState<ConnectionStatus>('DISCONNECTED')
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [lastTickLatencyMs, setLastTickLatencyMs] = useState<number>(0)

  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const retryCountRef = useRef<number>(0)
  const pingIntervalRef = useRef<number | null>(null)
  const isMountedRef = useRef<boolean>(true)

  // RAF-based frame throttling buffer to prevent UI event loop blocking
  const pendingStateRef = useRef<LiveState | null>(null)
  const rafIdRef = useRef<number | null>(null)

  const lastPingSentRef = useRef<number>(0)

  const scheduleStateUpdate = useCallback((nextState: LiveState, latencyMs: number) => {
    pendingStateRef.current = nextState
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (isMountedRef.current && pendingStateRef.current) {
          setState(pendingStateRef.current)
          setLastUpdated(new Date())
          if (latencyMs > 0 && latencyMs < 5000) {
            setLastTickLatencyMs(latencyMs)
          }
        }
        rafIdRef.current = null
      })
    }
  }, [])

  const connect = useCallback(() => {
    if (socketRef.current) {
      if (
        socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING
      ) {
        return
      }
      try {
        socketRef.current.close()
      } catch {}
    }

    const wsUrl = getWsUrl()
    setStatus('RECONNECTING')

    try {
      const socket = new WebSocket(wsUrl)
      socketRef.current = socket

      socket.onopen = () => {
        if (!isMountedRef.current) return
        setStatus('CONNECTED')
        setError(null)
        retryCountRef.current = 0

        // Send immediate ping on connect to measure initial RTT
        lastPingSentRef.current = performance.now()
        socket.send('ping')

        // Heartbeat ping interval every 5 seconds
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            lastPingSentRef.current = performance.now()
            socket.send('ping')
          }
        }, 5000)
      }

      socket.onmessage = (event) => {
        if (!isMountedRef.current) return
        try {
          const parsed = JSON.parse(event.data)
          if (parsed.type === 'PONG') {
            // Precise client-side round-trip time
            const rtt = Math.max(1, Math.round(performance.now() - lastPingSentRef.current))
            setLastTickLatencyMs(rtt)
          } else if (parsed.type === 'LIVE_STATE' && parsed.data) {
            const liveData = parsed.data as LiveState
            const rawTime = parsed.timestamp || liveData.timestamp
            let latency = 0
            if (rawTime) {
              const iso = rawTime.endsWith('Z') || rawTime.includes('+') ? rawTime : rawTime + 'Z'
              const parsedMs = new Date(iso).getTime()
              const diff = Math.max(0, Date.now() - parsedMs)
              if (!isNaN(diff) && diff < 5000) {
                latency = diff
              }
            }
            scheduleStateUpdate(liveData, latency)
          } else if (parsed.tick !== undefined) {
            // Raw state fallback
            scheduleStateUpdate(parsed as LiveState, 0)
          }
        } catch (err) {
          console.warn('Failed to parse WebSocket message:', err)
        }
      }

      socket.onerror = () => {
        if (!isMountedRef.current) return
        setError('WebSocket error')
      }

      socket.onclose = () => {
        if (!isMountedRef.current) return
        setStatus('DISCONNECTED')
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)

        // Exponential backoff reconnect (1s, 2s, 5s max)
        const delay =
          RECONNECT_DELAYS_MS[
            Math.min(retryCountRef.current, RECONNECT_DELAYS_MS.length - 1)
          ]
        retryCountRef.current += 1

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (isMountedRef.current) {
            connect()
          }
        }, delay)
      }
    } catch (err: any) {
      if (!isMountedRef.current) return
      setError(err?.message || 'Failed to initialize WebSocket')
      setStatus('ERROR')

      const delay =
        RECONNECT_DELAYS_MS[
          Math.min(retryCountRef.current, RECONNECT_DELAYS_MS.length - 1)
        ]
      retryCountRef.current += 1

      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (isMountedRef.current) {
          connect()
        }
      }, delay)
    }
  }, [scheduleStateUpdate])

  const reconnect = useCallback(() => {
    retryCountRef.current = 0
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    if (socketRef.current) {
      try {
        socketRef.current.close()
      } catch {}
      socketRef.current = null
    }
    connect()
  }, [connect])

  useEffect(() => {
    isMountedRef.current = true
    connect()

    return () => {
      isMountedRef.current = false
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
      if (socketRef.current) {
        try {
          socketRef.current.close()
        } catch {}
      }
    }
  }, [connect])

  const isConnected = status === 'CONNECTED'

  return {
    liveState: state,
    state, // alias for existing components
    isConnected,
    connected: isConnected, // alias for existing components
    status,
    error,
    lastTickLatencyMs,
    reconnect,
    lastUpdated,
  }
}
