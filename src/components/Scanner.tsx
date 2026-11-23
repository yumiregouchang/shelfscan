import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

interface Props {
  onDetected: (code: string) => void
}

/** Turn the error from getUserMedia into something a user can act on. */
function cameraErrorMessage(err: unknown): string {
  const name = err instanceof Error ? err.name : ''
  if (name === 'NotAllowedError') return 'No camera permission. Allow camera access next to the address bar, then reload.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera found.'
  if (!window.isSecureContext) return 'The camera only works on HTTPS or localhost.'
  return `Could not open the camera: ${String(err)}`
}

export function Scanner({ onDetected }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [error, setError] = useState<string | null>(null)

    // Keep the latest callback in a ref, so the camera effect below can run only once.
    const onDetectedRef = useRef(onDetected)
    useEffect(() => {
      const video = videoRef.current 
      if (!video) return
      const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]]])
      const reader = new BrowserMultiFormatReader(hints, {delayBetweenScanSuccess: 1500})    
      let controls: IScannerControls | undefined
      let cancelled = false
      
      async function start(video: HTMLVideoElement) {
        const stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'enviroment'}})
        if (cancelled) {
        // This effect was already cleaned up (React StrictMode does that once in dev).
        // Release the camera, but don't touch <video>: the next run is using it.
            stream.getTracks().forEach((track) => track.stop())
            return        
        }
        const c = await reader.decodeFromStream(stream, video, (result) => {
            if (result) onDetectedRef.current(result.getText())
        })
        if (cancelled) c.stop()
        else controls = c 
      }

      start(video).catch((err: unknown) =>
    setError(cameraErrorMessage(err)))

      return () => {
        cancelled = true
        controls?.stop() // stops the scan loop, the camera, and clears <video>
      }
    }, [])

    return (
        <div className="scanner">
            {error ? (
                <p className="error">{error}</p>
            ) : (
                <div className="viewfinder">
                    <video ref={videoRef} muted playsInline />
                    <div className="aim-box" />
                </div>
            )}
            <p className="hint">Put the Barcode inside the box</p>
        </div>
    )
}