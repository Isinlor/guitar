<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>

  <nav>
    <RouterLink to="/">Fretboard</RouterLink>
    <RouterLink to="/tuner">Tuner</RouterLink>
    <RouterLink to="/about">About</RouterLink>
  </nav>

  <RouterView />
</template>

<style scoped>

</style>
