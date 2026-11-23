// Blur detection with the variance of the Laplacian.
// Sharp image -> strong edges -> Laplacian values swing far from 0 -> large variance.
// Blurry image -> soft edges -> Laplacian values stay near 0 -> small variance.

/** RGBA bytes (from canvas getImageData) -> one brightness value per pixel, 0..255 */
export function toGray(rgba: ArrayLike<number>, width: number, height: number): Float32Array {
    const gray = new Float32Array(width * height)
    for (let i = 0; i < width * height; i++) {
        const r = rgba[4 * i]
        const g = rgba[4 * i + 1]
        const b = rgba[4 * i + 2]
        gray[i] = 0.299 * r + 0.587 * g + 0.114 * b // same weights as OpenCV's RGB2GRAY
    }
    return gray
}

/**
 * Convolve with the 3x3 Laplacian kernel
 *    0  1  0
 *    1 -4  1
 *    0  1  0
 * and return the variance of the result. Border pixels are skipped.
 */
export function laplacianVariance(gray: ArrayLike<number>, width: number, height: number): number {
    if (width < 3 || height < 3) return 0
    let sum = 0
    let sumSq = 0
    let n = 0
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = y * width + x
            const lap = gray[i - width] + gray[i + width] + gray[i - 1] + gray[i + 1] - 4 * gray[i]
            sum += lap 
            sumSq += lap * lap
            n++
        }
    }
    const mean = sum / n
    return sumSq / n - mean * mean // Var = E[X^2] - (E[X])^2
}