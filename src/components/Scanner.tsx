import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { measureSharpness, SAMPLE_HEIGHT, SAMPLE_WIDTH } from '../lib/frame'

interface Props {
  onDetected: (code: string) => void
  blurThreshold: number
}

/** Turn the error from getUserMedia into something a user can act on. */
function cameraErrorMessage(err: unknown): string {
  const name = err instanceof Error ? err.name : ''
  if (name === 'NotAllowedError') return 'No camera permission. Allow camera access next to the address bar, then reload.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera found.'
  if (!window.isSecureContext) return 'The camera only works on HTTPS or localhost.'
  return `Could not open the camera: ${String(err)}`
}

export function Scanner({ onDetected, blurThreshold }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [error, setError] = useState<string | null>(null)
    const [sharpness, setSharpness] = useState<number | null>(null)

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

    // 2) Every 300 ms, measure how sharp the centre of the picture is.
    useEffect(() => {
      const canvas = document.createElement('canvas')
      canvas.width = SAMPLE_WIDTH
      canvas.height = SAMPLE_HEIGHT
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      const timer = setInterval(() => {
        const video = videoRef.current
        if (!ctx || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
        setSharpness(measureSharpness(video, ctx))
      }, 300)
      return () => clearInterval(timer)
    }, [])

    const blurry = sharpness !== null && sharpness < blurThreshold

    return (
      <div className="scanner">
        {error ? (
          <p className="error">{error}</p>
        ) : (
          <div className="viewfinder">
            <video ref={videoRef} muted playsInline />
            <div className={blurry ? 'aim-box blurry' : 'aim-box'} />
          </div>
        )}
        <p className={blurry ? 'hint blurry' : 'hint'}>
          {sharpness === null
            ? 'Opening camera…'
            : blurry
              ? 'Too blurry: hold steady, or move back so the camera can focus'
              : 'Put the barcode inside the box'}
          <span className="score">Sharpness {sharpness === null ? '–' : Math.round(sharpness)}</span>
        </p>
      </div>
    )
}