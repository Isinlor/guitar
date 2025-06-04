import autoCorrelate from "@/model/autocorrelate";
onmessage = function (e) {
    const { index, time, buffer, sampleRate, expectedFrequency } = e.data;
    const correlate = autoCorrelate(buffer, sampleRate, expectedFrequency);
    if (correlate === -1)
        return;
    postMessage({ index, time, result: correlate });
};
