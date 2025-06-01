import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TrackComponent from './TrackComponent.vue'; // The new canvas-based component
import type { TrackFingeringWithAlternatives, NoteEventWithFingeringAndAlternatives, Instrument } from '@/model/types';

// Mocks
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock for HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 })),
  // Add any other context methods used by the component
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  getLineDash: vi.fn(() => []),
  setLineDash: vi.fn(),
  canvas: { width: 800, height: 600 } // Mock canvas dimensions if accessed
})) as any;

// Mock for Web Animations API
window.Animation = vi.fn().mockImplementation(() => ({
  play: vi.fn(),
  pause: vi.fn(),
  cancel: vi.fn(),
  finish: vi.fn(),
  reverse: vi.fn(),
  updatePlaybackRate: vi.fn(),
  playbackRate: 1,
  currentTime: 0,
  effect: null,
  finished: Promise.resolve(),
  pending: false,
  playState: 'idle',
  ready: Promise.resolve(),
  startTime: 0,
  timeline: null,
  id: '',
  oncancel: null,
  onfinish: null,
  onremove: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as any;
document.timeline = { currentTime: 0 } as any;


// Mock for navigator.mediaDevices.getUserMedia
Object.defineProperty(window.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn(() => [{ stop: vi.fn() }]),
    }),
  },
});

// Mock for AudioContext and related nodes
const mockAnalyser = {
  fftSize: 2048,
  frequencyBinCount: 1024,
  getFloatTimeDomainData: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
};
const mockAudioSource = {
  connect: vi.fn(),
  disconnect: vi.fn(),
};
window.AudioContext = vi.fn().mockImplementation(() => ({
  createAnalyser: vi.fn(() => mockAnalyser),
  createMediaStreamSource: vi.fn(() => mockAudioSource),
  resume: vi.fn().mockResolvedValue(undefined),
  suspend: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  sampleRate: 44100,
  currentTime: 0,
  state: 'running',
  // Add other AudioContext methods/properties if needed
})) as any;

// Mock for AutoCorrelateWorker
// Store the worker instance and its onmessage handler if needed for more complex simulations
let workerInstanceMock: any;
vi.mock('@/model/worker/autocorrelateWorker?worker', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      workerInstanceMock = {
        postMessage: vi.fn((message) => {
          // Simulate worker behavior for testing success condition
          if (workerInstanceMock.onmessage && message.expectedFrequency && message.buffer) {
            const response = {
              originalIndex: message.originalIndex,
              time: 100, // dummy time
              detectedFrequency: message.expectedFrequency, // Assume perfect detection
              result: true // Simplified: true for successful match based on problem description
            };
            workerInstanceMock.onmessage({ data: response });
          }
        }),
        onmessage: null, // Will be set by the component
        addEventListener: vi.fn(), // Not typically used if onmessage is set directly
        removeEventListener: vi.fn(),
        terminate: vi.fn(),
      };
      return workerInstanceMock;
    }),
  };
});


describe('TrackComponent (Canvas)', () => {
  let mockMusic: TrackFingeringWithAlternatives;
  let mockInstrument: { strings: number; frets: number };

  beforeEach(async () => { // Make beforeEach async if using await inside
    // Reset mocks for each test
    vi.clearAllMocks();

    global.ResizeObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
    }));

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        fillRect: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fillText: vi.fn(), measureText: vi.fn(() => ({ width: 10 })), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(),
        getLineDash: vi.fn(() => []), setLineDash: vi.fn(),
        canvas: { width: 800, height: 600, parentElement: { clientWidth: 800 } }
    });

    // Re-initialize AudioContext mock if specific state per test is needed
    window.AudioContext = vi.fn().mockImplementation(() => ({
        createAnalyser: vi.fn(() => mockAnalyser),
        createMediaStreamSource: vi.fn(() => mockAudioSource),
        resume: vi.fn().mockResolvedValue(undefined),
        suspend: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        sampleRate: 44100,
        currentTime: 0,
        state: 'running',
    })) as any;
    Object.defineProperty(window.navigator, 'mediaDevices', {
        writable: true,
        value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: vi.fn(() => [{ stop: vi.fn() }]), }) },
    });


    mockMusic = [
      { note: 60, startTimeMs: 0, durationMs: 500, fingering: { string: 1, fret: 0, finger: 0 }, alternatives: [], success: false, name: 'C4' },
      { note: 62, startTimeMs: 500, durationMs: 500, fingering: { string: 2, fret: 1, finger: 1 }, alternatives: [], success: false, name: 'D4' },
    ] as NoteEventWithFingeringAndAlternatives[]; // Added 'name' for completeness if your type uses it
    mockInstrument = { strings: 6, frets: 12 };

    // Reset the specific mock for the worker module if needed, or rely on vi.clearAllMocks()
    // and the factory function in vi.mock to provide a fresh instance.
    // The factory function for the worker mock should be robust enough.
  });

  it('renders the correct number of strings based on instrument prop', async () => {
    const wrapper = mount(TrackComponent, {
      props: { music: mockMusic, instrument: mockInstrument },
    });
    await wrapper.vm.$nextTick();

    const canvas = wrapper.find('canvas').element;
    const ctx = canvas.getContext('2d');

    expect(ctx.moveTo).toHaveBeenCalledTimes(mockInstrument.strings);
    expect(ctx.lineTo).toHaveBeenCalledTimes(mockInstrument.strings);
  });

  it('calls play on the animation when play button is clicked', async () => {
    const wrapper = mount(TrackComponent, {
      props: { music: mockMusic, instrument: mockInstrument },
    });
    await wrapper.vm.$nextTick();

    const playButton = wrapper.findAll('button').find(b => b.text() === 'Play');
    expect(playButton?.exists()).toBe(true);
    await playButton.trigger('click');

    // Access the component instance's reactive state
    const vm = wrapper.vm as any; // Use 'any' for easier access in tests or define a type for vm
    expect(vm.playState).toBe('running');
    // Relies on the global Animation mock
    // This checks if *any* Animation instance's play was called.
    // If you have multiple animations, this might need refinement.
    expect(window.Animation().play).toHaveBeenCalled();
  });

  it('updates playState to "paused" when pause button is clicked', async () => {
    const wrapper = mount(TrackComponent, {
      props: { music: mockMusic, instrument: mockInstrument },
    });
    const vm = wrapper.vm as any;
    await vm.$nextTick();

    const playButton = wrapper.findAll('button').find(b => b.text() === 'Play');
    await playButton.trigger('click');
    await vm.$nextTick(); // allow play state to update
    expect(vm.playState).toBe('running');

    const pauseButton = wrapper.findAll('button').find(b => b.text() === 'Pause');
    expect(pauseButton?.exists()).toBe(true);
    await pauseButton.trigger('click');
    await vm.$nextTick(); // allow pause state to update

    expect(vm.playState).toBe('paused');
    expect(window.Animation().pause).toHaveBeenCalled();
  });

  it('updates currentTime when seek slider is used', async () => {
    const wrapper = mount(TrackComponent, {
      props: { music: mockMusic, instrument: mockInstrument },
    });
    const vm = wrapper.vm as any;
    await vm.$nextTick();

    const seekSlider = wrapper.find('input[type="range"][id="seekSlider"]');
    expect(seekSlider.exists()).toBe(true);

    const seekTime = 250;
    // await seekSlider.setValue(seekTime.toString()); // setValue might not work as expected with v-model on range
    (seekSlider.element as HTMLInputElement).value = seekTime.toString();
    await seekSlider.trigger('input');
    await vm.$nextTick();

    expect(vm.manualSeekTimeMs).toBe(seekTime.toString());
    expect(vm.currentTime).toBe(seekTime);

    const ctx = wrapper.find('canvas').element.getContext('2d');
    // clearRect is called by drawStrings, which is part of renderLoop
    expect(ctx.clearRect).toHaveBeenCalled();
  });

  it('marks a note as success when worker detects correct pitch during playback', async () => {
    // Use a fresh copy of music for this test to avoid state leakage if not careful
    const testMusic = JSON.parse(JSON.stringify(mockMusic)) as TrackFingeringWithAlternatives;

    const wrapper = mount(TrackComponent, {
      props: {
        music: testMusic,
        instrument: mockInstrument
      },
    });
    const vm = wrapper.vm as any;
    await vm.$nextTick(); // Initial render cycle

    const playButton = wrapper.findAll('button').find(b => b.text() === 'Play');
    await playButton.trigger('click'); // This should start animation and audio detection
    await vm.$nextTick(); // Allow play() to execute, including async audio setup if any

    // Give time for RAF loop (animationStep) to run, which calls performAudioDetection,
    // which then calls worker.postMessage. The mock worker immediately calls onmessage.
    // Vitest runs on a fake clock by default for timers unless configured otherwise.
    // We might need vi.advanceTimersByTime if using fake timers and RAF is mocked with timers.
    // For now, a small promise-based delay for async operations.
    await new Promise(r => setTimeout(r, 20)); // Short delay for async operations
    await vm.$nextTick(); // Allow component to react to worker message

    expect(testMusic[0].success).toBe(true);

    // Check if the note color would change - indirect check via clearRect then fillRect
    const ctx = wrapper.find('canvas').element.getContext('2d');
    expect(ctx.fillRect).toHaveBeenCalled(); // fillRect is part of drawNotes
  });

});
