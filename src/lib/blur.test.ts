import { describe, expect, it } from 'vitest'
import { laplacianVariance, toGray } from './blur'

const W = 64
const H = 32

/** Vertical black/white bars of different widths, like a barcode */
function barcodeImage(): Float32Array {
  const widths = [1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 1, 2]
  const columns: number[] = []
  let black = true
  while (columns.length < W) {
    for (const w of widths) {
      for (let k = 0; k < w; k++) columns.push(black ? 0 : 255)
      black = !black
    }
  }
  const img = new Float32Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) img[y * W + x] = columns[x]
  return img
}

/** Box blur with radius r (average of a (2r+1) x (2r+1) square), edges clamped */
function boxBlur(img: Float32Array, r: number): Float32Array {
  const out = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let sum = 0
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const yy = Math.min(H - 1, Math.max(0, y + dy))
          const xx = Math.min(W - 1, Math.max(0, x + dx))
          sum += img[yy * W + xx]
        }
      }
      out[y * W + x] = sum / (2 * r + 1) ** 2
    }
  }
  return out
}

describe('toGray', () => {
  it('weights red, green and blue like OpenCV', () => {
    const rgba = [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]
    const gray = toGray(rgba, 4, 1)
    expect(gray[0]).toBeCloseTo(76.245, 3)
    expect(gray[1]).toBeCloseTo(149.685, 3)
    expect(gray[2]).toBeCloseTo(29.07, 3)
    expect(gray[3]).toBeCloseTo(255, 3)
  })
})

describe('laplacianVariance', () => {
  it('is 0 for a flat image', () => {
    expect(laplacianVariance(new Float32Array(W * H).fill(128), W, H)).toBe(0)
  })
  it('is 0 for a smooth brightness ramp (Laplacian of a linear function is 0)', () => {
    const ramp = new Float32Array(W * H)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) ramp[y * W + x] = 2 * x + y
    expect(laplacianVariance(ramp, W, H)).toBeCloseTo(0, 6)
  })
  it('gets smaller as the blur gets stronger', () => {
    const sharp = barcodeImage()
    const scores = [0, 1, 2, 3].map((r) => laplacianVariance(r === 0 ? sharp : boxBlur(sharp, r), W, H))
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeLessThan(scores[i - 1])
    expect(scores[1]).toBeLessThan(scores[0] / 5) // even a small blur cuts the score a lot
  })
  it('ignores a brightness offset; halving the contrast divides it by 4', () => {
    const img = barcodeImage()
    const brighter = img.map((v) => v * 0.5 + 100)
    expect(laplacianVariance(brighter, W, H)).toBeCloseTo(laplacianVariance(img, W, H) / 4, 3)
  })
  it('returns 0 for images too small to filter', () => {
    expect(laplacianVariance([1, 2, 3, 4], 2, 2)).toBe(0)
  })
})