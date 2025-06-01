import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FretboardView from './FretboardView.vue';
import TrackComponent from '@/components/TrackComponent.vue'; // Import for stubbing

// Mock data for guitar and ukulele, similar to what's in FretboardView.vue
const guitar = {
  strings: 6,
  frets: 12
};

const ukulele = {
  strings: 4,
  frets: 12
};

// Mock for FingeringWorker
const mockPostMessage = vi.fn();
vi.mock('@/model/worker?worker', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      postMessage: mockPostMessage,
      onmessage: null, // Or vi.fn() if onmessage needs to be interactive
    }))
  };
});

// Mock for @tonejs/midi
vi.mock('@tonejs/midi', () => {
  return {
    Midi: vi.fn().mockImplementation(() => ({
      tracks: [{ notes: [{ midi: 60, time: 0, duration: 0.5, name: 'C4' }] }] // Mock track with notes
    }))
  };
});

// Mock for getNoteEvents (if it's complex, otherwise let it run)
vi.mock('@/model/midi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/model/midi')>()
  return {
    ...actual,
    getNoteEvents: vi.fn().mockReturnValue([{ pitch: 60, time: 0, duration: 0.5 }]) // Simple mock
  }
});

// Mock FileReader
const mockReadFile = vi.fn();
const mockReaderOnload = vi.fn();

vi.stubGlobal('FileReader', vi.fn(() => ({
  readAsText: mockReadFile,
  readAsArrayBuffer: mockReadFile, // Both can use the same mock if the content doesn't matter for the test
  onload: mockReaderOnload,
  result: JSON.stringify({ some: "json content" }) // Default mock result for JSON
})));


describe('FretboardView.vue', () => {
  let wrapper: any;

  beforeEach(() => {
    vi.clearAllMocks(); // Clear mocks before each test
    wrapper = mount(FretboardView, {
      global: {
        stubs: {
          TrackComponent: true // Stub TrackComponent to prevent its rendering and logic
        }
      }
    });
  });

  describe('Instrument Selection UI', () => {
    it('Test Case 1: updates selectedInstrument on radio button click', async () => {
      // Default check
      expect(wrapper.vm.selectedInstrument).toBe('guitar');

      // Find radio buttons - need to be more specific if there are other radios
      const radioButtons = wrapper.findAll('input[type="radio"]');
      const guitarRadio = radioButtons.find((rb: any) => rb.element.value === 'guitar');
      const ukuleleRadio = radioButtons.find((rb: any) => rb.element.value === 'ukulele');

      expect(guitarRadio).toBeDefined();
      expect(ukuleleRadio).toBeDefined();

      // Simulate click on 'ukulele'
      await ukuleleRadio.setValue(true); // For radio buttons, setValue(true) checks it
      expect(wrapper.vm.selectedInstrument).toBe('ukulele');

      // Simulate click back on 'guitar'
      await guitarRadio.setValue(true);
      expect(wrapper.vm.selectedInstrument).toBe('guitar');
    });

    it('Test Case 2: updates computed instrument property', async () => {
      // Initial state: guitar
      expect(wrapper.vm.instrument).toEqual(guitar);

      // Change to ukulele
      const ukuleleRadio = wrapper.find('input[type="radio"][value="ukulele"]');
      await ukuleleRadio.setValue(true);
      expect(wrapper.vm.instrument).toEqual(ukulele);

      // Change back to guitar
      const guitarRadio = wrapper.find('input[type="radio"][value="guitar"]');
      await guitarRadio.setValue(true);
      expect(wrapper.vm.instrument).toEqual(guitar);
    });
  });

  describe('FingeringWorker Interaction', () => {
    it('Test Case 3: calls FingeringWorker with correct instrumentName', async () => {
      const mockMidiFile = new File([new Uint8Array([0x4d, 0x54, 0x68, 0x64]).buffer], 'test.mid', { type: 'audio/midi' });

      // Mock FileReader behavior for MIDI
      mockReadFile.mockImplementation(function (this: any) {
        // `this` refers to the FileReader instance
        this.result = mockMidiFile.arrayBuffer(); // Provide ArrayBuffer for MIDI processing
        if (this.onload) {
          this.onload({ target: { result: this.result } });
        }
      });

      const eventMidi = { target: { files: [mockMidiFile] } };
      await wrapper.vm.handleFileUpload(eventMidi);

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({ instrumentName: 'guitar' }));

      // Change to ukulele
      mockPostMessage.mockClear();
      const ukuleleRadio = wrapper.find('input[type="radio"][value="ukulele"]');
      await ukuleleRadio.setValue(true);
      expect(wrapper.vm.selectedInstrument).toBe('ukulele'); // Ensure selection changed

      // Simulate file upload with ukulele selected
      await wrapper.vm.handleFileUpload(eventMidi);
      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({ instrumentName: 'ukulele' }));
    });
  });

  describe('TrackComponent Props', () => {
    it('Test Case 4: passes correct instrument prop to TrackComponent', async () => {
       // Re-mount with a specific stub for TrackComponent to inspect props
      wrapper = mount(FretboardView, {
        global: {
          stubs: {
            TrackComponent: {
              template: '<div class="stubbed-track-component"></div>',
              props: ['music', 'instrument']
            }
          }
        }
      });

      let trackComponentWrapper = wrapper.findComponent(TrackComponent);
      expect(trackComponentWrapper.exists()).toBe(true);
      expect(trackComponentWrapper.props('instrument')).toEqual(guitar);

      // Change to ukulele
      const ukuleleRadio = wrapper.find('input[type="radio"][value="ukulele"]');
      await ukuleleRadio.setValue(true);

      // Props are updated on next tick
      await wrapper.vm.$nextTick();

      trackComponentWrapper = wrapper.findComponent(TrackComponent); // Re-find after update
      expect(trackComponentWrapper.props('instrument')).toEqual(ukulele);

      // Change back to guitar
      const guitarRadio = wrapper.find('input[type="radio"][value="guitar"]');
      await guitarRadio.setValue(true);
      await wrapper.vm.$nextTick();

      trackComponentWrapper = wrapper.findComponent(TrackComponent); // Re-find after update
      expect(trackComponentWrapper.props('instrument')).toEqual(guitar);
    });
  });
});
