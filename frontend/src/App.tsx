import { useEffect, useState } from 'react'
import CommandCenter from './components/layout/CommandCenter'
import { useLiveState } from './hooks/useLiveState'
import { fetchHealth } from './services/api'

function App() {
  const [backendOnline, setBackendOnline] = useState(false)
  const [serviceName, setServiceName] = useState<string>()
  const {
    state: liveState,
    status: connectionStatus,
    lastTickLatencyMs,
    reconnect,
  } = useLiveState()

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await fetchHealth()
        setBackendOnline(health.status === 'ok')
        setServiceName(health.service)
      } catch {
        setBackendOnline(false)
        setServiceName(undefined)
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 8000)
    return () => clearInterval(interval)
  }, [])

  return (
    <CommandCenter
      backendOnline={backendOnline}
      serviceName={serviceName}
      connectionStatus={connectionStatus}
      liveState={liveState}
      lastTickLatencyMs={lastTickLatencyMs}
      onReconnect={reconnect}
    />
  )
}

export default App
