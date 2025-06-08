import findPitch from "@/model/autocorrelate";

onmessage = function (e: MessageEvent<{ index: number, time: number, buffer: Float32Array, sampleRate: number, expectedFrequency: number }>) {

  const { index, time, buffer, sampleRate } = e.data;

  const correlate = findPitch(buffer, sampleRate);

  if (correlate.frequency === -1) return;

  postMessage(
    { index, time, result: correlate }
  );

}