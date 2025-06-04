var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import TrackComponent from '@/components/TrackComponent.vue';
import { getNoteEvents } from '@/model/midi';
import { Midi } from '@tonejs/midi';
import { ref } from 'vue';
import FingeringWorker from '@/model/worker?worker';
const ukulele = {
    strings: 4,
    frets: 12
};
const guitar = {
    strings: 6,
    frets: 12
};
const music = ref([]); // Initialize music ref
const handleFileUpload = (event) => {
    var _a;
    const file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => __awaiter(void 0, void 0, void 0, function* () {
            var _b;
            console.log(file.type);
            if (file.type === 'audio/midi') {
                console.log('MIDI file detected');
                const midi = new Midi(yield file.arrayBuffer());
                console.log(midi);
                const track = midi.tracks.filter(track => track.notes.length > 0)[0];
                const noteEvents = getNoteEvents(track);
                const worker = new FingeringWorker();
                worker.onmessage = (e) => {
                    music.value = e.data;
                };
                worker.postMessage({ noteEvents, instrumentName: 'ukulele' });
                return;
            }
            try {
                music.value = JSON.parse((_b = e.target) === null || _b === void 0 ? void 0 : _b.result);
            }
            catch (error) {
                console.error('Error parsing JSON:', error);
            }
        });
        reader.readAsText(file);
    }
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)(Object.assign({ onChange: (__VLS_ctx.handleFileUpload) }, { type: "file", accept: ".json,.mid" }));
/** @type {[typeof TrackComponent, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(TrackComponent, new TrackComponent({
    music: (__VLS_ctx.music),
    instrument: (__VLS_ctx.guitar),
}));
const __VLS_1 = __VLS_0({
    music: (__VLS_ctx.music),
    instrument: (__VLS_ctx.guitar),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(Object.assign({ class: "detected-note" }));
/** @type {__VLS_StyleScopedClasses['detected-note']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            TrackComponent: TrackComponent,
            guitar: guitar,
            music: music,
            handleFileUpload: handleFileUpload,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
