import { describe, it, expect } from 'vitest';
import { trackFingeringToTab } from './tabs';
import { Instrument } from './instrument';
import { TrackFingering } from './types';

describe('trackFingeringToTab', () => {
  it('converts track fingering to ASCII tabs', () => {
    const track: TrackFingering = [
      { note: 40, startTimeMs: 0, durationMs: 500, fingering: { string: 6, fret: 0, finger: 0 } },
      { note: 45, startTimeMs: 500, durationMs: 500, fingering: { string: 5, fret: 0, finger: 0 } },
    ];

    const tab = trackFingeringToTab(track, Instrument.guitar());

    expect(tab).toBe([
      '1|----',
      '2|----',
      '3|----',
      '4|----',
      '5|--0-',
      '6|0---',
    ].join('\n'));
  });
});
