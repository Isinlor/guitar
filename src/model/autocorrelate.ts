export default function autoCorrelate(buf: Float32Array, sampleRate: number, expectedFrequency: number | null = null) {
  // Implements the ACF2+ algorithm for pitch detection using autocorrelation.
  // This function takes an audio buffer 'buf' and the sample rate 'sampleRate' to determine the pitch of the audio signal.
  // It calculates the autocorrelation of the signal to find periodic patterns which represent the fundamental frequency or pitch.

  var SIZE = buf.length; // Total size of the input buffer
  var rms = 0; // Variable to store the root mean square of the buffer

  // RMS Calculation:
  // The Root Mean Square (RMS) is calculated to determine the overall power or amplitude of the signal.
  // This is important as signals with very low power might not contain enough data to accurately determine pitch.
  // Signals with an RMS below a certain threshold are considered too weak to process, thus returning -1.
  for (var i = 0; i < SIZE; i++) {
      var val = buf[i];
      rms += val * val; // Sum of squares of the buffer values
  }
  rms = Math.sqrt(rms / SIZE); // Compute the root mean square
  if (rms < 0.005) // Check if the RMS is below a threshold value
      return -1; // Return -1 if there's not enough signal to process

  // Trimming Silence:
  // This section trims the buffer to remove leading and trailing silence or low amplitude sections.
  // It helps in focusing the autocorrelation calculation on the portions of the signal where there is actual data,
  // reducing the influence of noise and improving the accuracy of pitch detection.
  var r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (var i = 0; i < SIZE / 2; i++)
      if (Math.abs(buf[i]) < thres) { r1 = i; break; } // Set r1 to the index where signal exceeds the threshold
  for (var i = 1; i < SIZE / 2; i++)
      if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; } // Set r2 to the index where signal falls below the threshold

  buf = buf.slice(r1, r2); // Trim the buffer to the determined range
  SIZE = buf.length; // Update the SIZE to the new buffer length

  var c = new Array(SIZE).fill(0); // Array to store autocorrelation results
  // Autocorrelation Calculation:
  // Here the autocorrelation function is calculated by summing up the products of the signal samples with their delayed versions.
  // This process is repeated for varying lags, identifying how the signal correlates with itself over time.
  // Peaks in this function represent potential pitch periods of the underlying signal.
  for (var i = 0; i < SIZE; i++)
      for (var j = 0; j < SIZE - i; j++)
          c[i] = c[i] + buf[j] * buf[j + i]; // Sum of product of the buffer with its delayed version

  var d = 0; while (c[d] > c[d + 1]) d++; // Find the first drop in autocorrelation values
  var maxval = -1, maxpos = -1;
  // Peak Detection:
  // After calculating the autocorrelation, the next step is to identify the highest peak following the first drop.
  // This peak represents the most significant period where the signal repeats itself, corresponding to the fundamental pitch.
  for (var i = d; i < SIZE; i++) {
      if (c[i] > maxval) {
          maxval = c[i];
          maxpos = i; // Update max position to the index of the new maximum
      }
  }
  var T0 = maxpos; // The estimated pitch period in samples

  var expectedPositionRank = 0;
  if (expectedFrequency) {
    var expectedPositionA = Math.floor(sampleRate / expectedFrequency);
    var expectedPositionB = Math.ceil(sampleRate / expectedFrequency);
    var expectedPositionAValue = c[expectedPositionA];
    var expectedPositionBValue = c[expectedPositionB];
    for (var i = d; i < SIZE; i++) {
      if (c[i] > expectedPositionAValue && c[i] > expectedPositionBValue) {
        expectedPositionRank++;
      }
    }
  }

  // Parabolic Interpolation:
  // To enhance the accuracy of pitch detection, parabolic interpolation is used around the detected peak.
  // This method fits a parabola to the three points around the peak and uses the vertex as a more accurate estimation of the pitch period.
  var x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  var a = (x1 + x3 - 2 * x2) / 2; // Coefficient of the quadratic term
  var b = (x3 - x1) / 2; // Coefficient of the linear term
  if (a) T0 = T0 - b / (2 * a); // Adjust T0 using the vertex formula

  return { frequency: sampleRate / T0, expectedFrequencyRank: expectedPositionRank }; // Return the estimated pitch (frequency) of the signal
  // The final output is the frequency calculated from the adjusted pitch period T0,
  // providing an estimate of the fundamental frequency at which the segment of the audio signal is oscillating.
}