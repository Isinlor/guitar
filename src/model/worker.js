import { createTrackFingering } from "@/model/fingering/fingering";
import { Instrument } from "@/model/instrument";
onmessage = function (e) {
    const { instrumentName, noteEvents } = e.data;
    postMessage(createTrackFingering(Instrument.get(instrumentName), noteEvents));
};
