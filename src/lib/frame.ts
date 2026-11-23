// Browser-only part of blur detection: copy the centre of the video into a small canvas.
import { laplacianVariance, toGray } from './blur'

// Fixed sample size: scores are only comparable if every frame is measured at the same size.
export const SAMPLE_WIDTH = 320
export const SAMPLE_HEIGHT = 160

/** Sharpness of the centre box of the current video frame (where the user aims the barcode). */
export function measureSharpness(video: HTMLVideoElement, ctx: CanvasRenderingContext2D): number {
  const vw = video.videoWidth
  const vh = video.videoHeight
  // A 2:1 box in the middle: 60% of the width, but never taller than 60% of the height.
  const cropW = Math.min(vw * 0.6, vh * 1.2)
  const cropH = cropW / 2
  const sx = (vw - cropW) / 2
  const sy = (vh - cropH) / 2
  ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT)
  const { data } = ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT)
  return laplacianVariance(toGray(data, SAMPLE_WIDTH, SAMPLE_HEIGHT), SAMPLE_WIDTH, SAMPLE_HEIGHT)
}