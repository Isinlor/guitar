var _a;
import { frequencyFromNoteNumber, noteNumberFromFrequency } from '@/model/midi';
import AutoCorrelateWorker from '@/model/worker/autocorrelateWorker?worker';
import { useRafFn, useWindowSize } from '@vueuse/core';
import { computed, ref, watch, watchEffect } from 'vue';
const windowSize = useWindowSize();
const conversion = computed(() => 25 / music.value.reduce((acc, tab) => Math.min(acc, tab.durationMs), 350));
const offset = 200;
const props = defineProps();
const music = computed(() => props.music.map((tab) => {
    return Object.assign(Object.assign({}, tab), { startTimeMs: tab.startTimeMs + 5000, success: false });
}));
const tabsGroupedByStrings = computed(() => {
    return music.value.reduce((acc, tab) => {
        if (!acc[tab.fingering.string]) {
            acc[tab.fingering.string] = [];
        }
        acc[tab.fingering.string].push(tab);
        return acc;
    }, {});
});
const maxTimeMs = computed(() => {
    return music.value.reduce((acc, tab) => {
        return Math.max(acc, tab.startTimeMs + tab.durationMs);
    }, 0);
});
const tabs = ref();
const playState = ref('idle');
let animation = ref();
const playbackRate = ref(1);
watchEffect(() => {
    if (animation.value)
        animation.value.playbackRate = playbackRate.value;
});
let analyser;
let dataArray = new Float32Array(4096 / 2);
let audioContext = new window.AudioContext({
    latencyHint: 'interactive',
    sampleRate: 44100
});
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    let audioInput = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    audioInput.connect(analyser);
});
const detectionWorker = new AutoCorrelateWorker();
const time = ref(0);
const note = ref(0);
const correlated = ref({});
const results = ref([]);
const detection = useRafFn(() => {
    var _a, _b, _c;
    time.value = Number((_b = (_a = animation.value) === null || _a === void 0 ? void 0 : _a.currentTime) !== null && _b !== void 0 ? _b : 0);
    const playedNoteEventIndex = music.value.findIndex(tab => tab.startTimeMs <= time.value && (tab.startTimeMs + tab.durationMs) >= time.value);
    const playedNoteEvent = music.value[playedNoteEventIndex];
    note.value = (_c = playedNoteEvent === null || playedNoteEvent === void 0 ? void 0 : playedNoteEvent.note) !== null && _c !== void 0 ? _c : 0;
    if (!playedNoteEvent)
        return;
    analyser.getFloatTimeDomainData(dataArray);
    detectionWorker.postMessage({
        index: playedNoteEventIndex,
        time: time.value,
        buffer: dataArray,
        sampleRate: audioContext.sampleRate,
        expectedFrequency: frequencyFromNoteNumber(note.value)
    });
    detectionWorker.onmessage = (e) => {
        var _a;
        const { index, time, result } = e.data;
        const playedNoteEvent = music.value[index];
        const expectedNote = playedNoteEvent.note;
        if (noteNumberFromFrequency(result.frequency) === expectedNote) {
            playedNoteEvent.success = true;
        }
        // console.log(results.value);
        const noteEvent = { note: playedNoteEvent.note, startTimeMs: playedNoteEvent.startTimeMs, durationMs: playedNoteEvent.durationMs };
        results.value[index] = (_a = results.value[index]) !== null && _a !== void 0 ? _a : { record: [], noteEvent };
        results.value[index].record.push({ time, detected: noteNumberFromFrequency(result.frequency) });
    };
}, { fpsLimit: Math.ceil(audioContext.sampleRate / dataArray.length) });
watch([music], () => {
    var _a, _b;
    if (animation.value)
        (_a = animation.value) === null || _a === void 0 ? void 0 : _a.cancel();
    animation.value = (_b = tabs.value) === null || _b === void 0 ? void 0 : _b.animate({ transform: `translate(${-maxTimeMs.value * conversion.value}px)` }, { duration: maxTimeMs.value, playbackRate: playbackRate.value });
    pause();
    if (!animation.value)
        return;
    animation.value.onfinish = () => {
        playState.value = 'finished';
        music.value.forEach(tab => tab.success = false);
        detection.pause();
    };
    animation.value.oncancel = () => {
        playState.value = 'idle';
        music.value.forEach(tab => tab.success = false);
        detection.pause();
    };
}, { immediate: true });
function play() {
    var _a;
    (_a = animation.value) === null || _a === void 0 ? void 0 : _a.play();
    playState.value = 'running';
    detection.resume();
}
function pause() {
    var _a;
    (_a = animation.value) === null || _a === void 0 ? void 0 : _a.pause();
    playState.value = 'paused';
    detection.pause();
}
function stop() {
    var _a;
    (_a = animation.value) === null || _a === void 0 ? void 0 : _a.cancel();
    playState.value = 'idle';
    detection.pause();
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['note']} */ ;
/** @type {__VLS_StyleScopedClasses['note']} */ ;
// CSS variable injection
// CSS variable injection end
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(Object.assign({ class: "track" }));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(Object.assign({ class: "indicator" }, { style: ({ left: `${__VLS_ctx.offset}px` }) }));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(Object.assign({ class: "scroll-container" }));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(Object.assign({ class: "tab-container" }, { ref: "tabs" }));
/** @type {typeof __VLS_ctx.tabs} */ ;
for (const [string] of __VLS_getVForSourceType((__VLS_ctx.instrument.strings))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(Object.assign({ class: "tab-row" }, { key: (string) }));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(Object.assign(Object.assign({ class: "string" }, { class: ({ [`string-${string}`]: true }) }), { style: ({ width: `${Math.ceil(__VLS_ctx.offset + __VLS_ctx.maxTimeMs * __VLS_ctx.conversion + __VLS_ctx.windowSize.width.value)}px` }) }));
    for (const [tab] of __VLS_getVForSourceType((__VLS_ctx.tabsGroupedByStrings[string]))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(Object.assign(Object.assign({ class: "note" }, { class: ({ [tab.success ? `success` : `finger-${tab.fingering.finger}`]: true }) }), { style: ({
                left: `${Math.floor(__VLS_ctx.offset + tab.startTimeMs * __VLS_ctx.conversion)}px`,
                width: `${Math.floor(tab.durationMs * __VLS_ctx.conversion)}px`
            }) }));
        (tab.fingering.fret);
    }
}
if (__VLS_ctx.playState !== 'running') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(Object.assign({ onClick: (...[$event]) => {
            if (!(__VLS_ctx.playState !== 'running'))
                return;
            __VLS_ctx.play();
        } }, { style: {} }));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(Object.assign({ onClick: (...[$event]) => {
            if (!!(__VLS_ctx.playState !== 'running'))
                return;
            __VLS_ctx.pause();
        } }, { style: {} }));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(Object.assign({ onClick: (...[$event]) => {
        __VLS_ctx.stop();
    } }, { style: {} }));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(Object.assign({ type: "range", min: "0.1", max: "2", step: "0.1" }, { style: {} }));
(__VLS_ctx.playbackRate);
(__VLS_ctx.playbackRate);
((_a = __VLS_ctx.animation) === null || _a === void 0 ? void 0 : _a.playbackRate);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(Object.assign({ style: {} }));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(Object.assign({ class: "tag finger-0" }));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(Object.assign({ class: "tag finger-1" }));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(Object.assign({ class: "tag finger-2" }));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(Object.assign({ class: "tag finger-3" }));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(Object.assign({ class: "tag finger-4" }));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
(__VLS_ctx.time);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
(__VLS_ctx.note);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
(__VLS_ctx.correlated);
__VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
(JSON.stringify(__VLS_ctx.results, null, 2));
/** @type {__VLS_StyleScopedClasses['track']} */ ;
/** @type {__VLS_StyleScopedClasses['indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['scroll-container']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-container']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-row']} */ ;
/** @type {__VLS_StyleScopedClasses['string']} */ ;
/** @type {__VLS_StyleScopedClasses['note']} */ ;
/** @type {__VLS_StyleScopedClasses['tag']} */ ;
/** @type {__VLS_StyleScopedClasses['finger-0']} */ ;
/** @type {__VLS_StyleScopedClasses['tag']} */ ;
/** @type {__VLS_StyleScopedClasses['finger-1']} */ ;
/** @type {__VLS_StyleScopedClasses['tag']} */ ;
/** @type {__VLS_StyleScopedClasses['finger-2']} */ ;
/** @type {__VLS_StyleScopedClasses['tag']} */ ;
/** @type {__VLS_StyleScopedClasses['finger-3']} */ ;
/** @type {__VLS_StyleScopedClasses['tag']} */ ;
/** @type {__VLS_StyleScopedClasses['finger-4']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            windowSize: windowSize,
            conversion: conversion,
            offset: offset,
            tabsGroupedByStrings: tabsGroupedByStrings,
            maxTimeMs: maxTimeMs,
            tabs: tabs,
            playState: playState,
            animation: animation,
            playbackRate: playbackRate,
            time: time,
            note: note,
            correlated: correlated,
            results: results,
            play: play,
            pause: pause,
            stop: stop,
        };
    },
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
