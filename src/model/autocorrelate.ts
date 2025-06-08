/**
 * YIN Pitch Detection Algorithm Implementation.
 * Estimates the fundamental frequency of an audio signal.
 *
 * @param buf The audio buffer (Float32Array).
 * @param sampleRate The sample rate of the audio buffer.
 * @param expectedFrequency The expected frequency (optional, currently unused in this YIN implementation).
 * @returns An object containing the detected frequency (in Hz) and the probability (clarity) of the pitch.
 * Returns { frequency: -1, probability: 0 } if no pitch is detected.
 */
export default function findPitch(
  buf: Float32Array,
  sampleRate: number
): { frequency: number; probability: number } {
  // YIN algorithm constants/parameters
  const bufferSize = buf.length
  // The YIN buffer looks at lags up to half the main buffer size
  const yinBufferSize = Math.floor(bufferSize / 2)
  // Threshold for determining if a dip corresponds to a pitch. Lowering may find more pitches but increases errors.
  // A common starting value is 0.10 to 0.15.
  const probabilityThreshold = 0.15
  const yinBuffer = new Float32Array(yinBufferSize)

  let period = -1.0 // Best estimate of the period (in samples)
  let probability = 0.0 // Probability / clarity of the detected pitch

  // Step 1: Calculate the difference function d(tau)
  // Measures the squared difference between the signal and a shifted version of itself.
  for (let tau = 0; tau < yinBufferSize; tau++) {
    yinBuffer[tau] = 0
    for (let i = 0; i < yinBufferSize; i++) {
      const delta = buf[i] - buf[i + tau]
      yinBuffer[tau] += delta * delta
    }
  }

  // Step 2: Calculate the cumulative mean normalized difference function d'(tau)
  // This normalization helps find the true fundamental period by reducing the impact
  // of higher harmonics which might cause dips at shorter lags in d(tau).
  yinBuffer[0] = 1 // d'(0) is always 1
  let runningSum = 0
  for (let tau = 1; tau < yinBufferSize; tau++) {
    runningSum += yinBuffer[tau]
    // Avoid division by zero
    if (runningSum < 1e-10) {
      // Use a small epsilon
      yinBuffer[tau] = 1
    } else {
      // Normalize: d'(tau) = d(tau) / [(1/tau) * sum_{j=1 to tau} d(j)]
      yinBuffer[tau] *= tau / runningSum
    }
  }

  // Step 3: Absolute thresholding
  // Find the first dip (local minimum) in d'(tau) that is below the threshold.
  // Start search from tau = 2, as tau = 0 and tau = 1 are not typically meaningful periods.
  let tauEstimate = -1
  for (let tau = 2; tau < yinBufferSize; tau++) {
    if (yinBuffer[tau] < probabilityThreshold) {
      // Found a potential candidate dip below the threshold.
      // Now, ensure it's a local minimum by checking if the next value is larger.
      // If d'(tau+1) >= d'(tau), then tau is a local minimum.
      while (tau + 1 < yinBufferSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
        // Keep moving forward as long as the value is decreasing
        tau++
      }
      // We've found the bottom of the dip (or the start of a flat region) at index 'tau'.
      // This is our first estimate for the period.
      tauEstimate = tau
      // The probability is related to how deep the dip is (1 - dip_value).
      probability = 1 - yinBuffer[tauEstimate]
      break // Stop searching after finding the first dip below the threshold
    }
  }

  // Step 4: Parabolic Interpolation (Refinement)
  // If a candidate period was found (tauEstimate != -1), refine it by fitting a
  // parabola to the points around the minimum dip (tauEstimate-1, tauEstimate, tauEstimate+1)
  // and finding the parabola's vertex.
  if (tauEstimate !== -1) {
    // Ensure we are not at the boundaries of the yinBuffer
    const betterTau: number =
      tauEstimate > 0 && tauEstimate < yinBufferSize - 1
        ? (() => {
            const y1 = yinBuffer[tauEstimate - 1] // Value to the left
            const y2 = yinBuffer[tauEstimate] // Value at the minimum
            const y3 = yinBuffer[tauEstimate + 1] // Value to the right

            // Calculate coefficients for the parabola y = ax^2 + bx + c
            const a = (y1 + y3 - 2 * y2) / 2
            const b = (y3 - y1) / 2

            // Find the x-coordinate of the vertex: x = -b / 2a
            // Only adjust if there's noticeable curvature (a != 0)
            if (Math.abs(a) > 1e-6) {
              // Use epsilon to avoid division by near-zero
              const adjustment = -b / (2 * a)
              // Only apply adjustment if it's small (within one sample distance)
              if (Math.abs(adjustment) <= 1) {
                return tauEstimate + adjustment
              }
            }
            // If no significant curvature or adjustment is too large, use original estimate
            return tauEstimate
          })()
        : tauEstimate // Use original estimate if at the boundaries

    // Convert the refined period (in samples) to frequency (in Hz)
    period = betterTau
  }

  // Final result
  if (period !== -1) {
    // Calculate frequency: f = sampleRate / period
    const frequency = sampleRate / period
    return { frequency: frequency, probability: probability }
  } else {
    // No suitable dip found below the threshold
    return { frequency: -1, probability: 0 }
  }
}
