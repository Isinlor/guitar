<script setup lang="ts">

import TrackComponent from '@/components/TrackComponent.vue';
import { ref } from 'vue';

const ukulele = {
  strings: 4,
  frets: 12
};

const guitar = {
  strings: 6,
  frets: 12
};

const music = ref<any>([]); // Initialize music ref

const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        music.value = JSON.parse(e.target?.result as string);
      } catch (error) {
        console.error('Error parsing JSON:', error);
      }
    };
    reader.readAsText(file);
  }
};

</script>

<template>
  <input type="file" accept=".json" @change="handleFileUpload" />
  <track-component :music="music" :instrument="guitar" />  
  <div class="detected-note"></div>
</template>
