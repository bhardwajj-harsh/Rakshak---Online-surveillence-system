import { useEffect, useRef, useState } from 'react'
import { API_URL } from '../services/api'

type CameraSlot = 0 | 1

function pickDeviceForSlot(
  devices: MediaDeviceInfo[],
  slot: CameraSlot,
): MediaDeviceInfo | undefined {
  const videos = devices.filter((d) => d.kind === 'videoinput')
  if (videos.length === 0) return undefined

  const iphone = videos.find((d) => /iphone/i.test(d.label))
  const macBuiltIn = videos.find((d) =>
    /macbook|facetime|built[- ]?in|integrated/i.test(d.label),
  )

  if (slot === 1) {
    return iphone ?? videos.find((d) => d !== macBuiltIn) ?? videos[1] ?? videos[0]
  }
  return macBuiltIn ?? videos.find((d) => d !== iphone) ?? videos[0]
}

async function ensureCameraPermission(): Promise<MediaDeviceInfo[]> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  stream.getTracks().forEach((t) => t.stop())
  return navigator.mediaDevices.enumerateDevices()
}

export function useBrowserCameraIngest(enabled: boolean) {
  const [status, setStatus] = useState<'idle' | 'starting' | 'live' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const streamsRef = useRef<MediaStream[]>([])
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    if (!enabled) {
      setStatus('idle')
      setError(null)
      return
    }

    let cancelled = false

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error')
        setError('Browser does not support camera access')
        return
      }

      setStatus('starting')
      setError(null)

      try {
        const devices = await ensureCameraPermission()
        if (cancelled) return

        const slots: CameraSlot[] = [0, 1]
        for (const slot of slots) {
          const device = pickDeviceForSlot(devices, slot)
          const stream = await navigator.mediaDevices.getUserMedia({
            video: device?.deviceId
              ? { deviceId: { exact: device.deviceId }, width: 640, height: 360 }
              : { width: 640, height: 360 },
            audio: false,
          })
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }
          streamsRef.current.push(stream)

          const video = document.createElement('video')
          video.srcObject = stream
          video.muted = true
          video.playsInline = true
          await video.play()

          const canvas = document.createElement('canvas')
          canvas.width = 640
          canvas.height = 360
          const ctx = canvas.getContext('2d')
          if (!ctx) continue

          const intervalId = window.setInterval(async () => {
            if (cancelled || video.readyState < 2) return
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, 'image/jpeg', 0.72),
            )
            if (!blob) return
            try {
              const form = new FormData()
              form.append('file', blob, `cam${slot}.jpg`)
              await fetch(`${API_URL}/api/video/ingest/${slot}`, {
                method: 'POST',
                body: form,
              })
            } catch {
              /* backend may be restarting */
            }
          }, 100)
          timersRef.current.push(intervalId)
        }

        if (!cancelled) {
          setStatus('live')
          void fetch(`${API_URL}/api/video/reinit`, { method: 'POST' })
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setError(err instanceof Error ? err.message : 'Camera permission denied')
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      timersRef.current.forEach((id) => window.clearInterval(id))
      timersRef.current = []
      streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()))
      streamsRef.current = []
    }
  }, [enabled])

  return { status, error }
}
