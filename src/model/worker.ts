import { createTrackFingering } from "@/model/fingering/fingering";
import { Instrument } from "@/model/instrument";
import { NoteEvent } from "@/model/types";

onmessage = function (e: MessageEvent<{ instrumentName: string, noteEvents: NoteEvent[] }>) {

  const { instrumentName, noteEvents } = e.data;

  postMessage(
    createTrackFingering(Instrument.get(instrumentName), noteEvents)
  );

}