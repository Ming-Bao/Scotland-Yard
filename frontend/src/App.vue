<template>
  <ThemeToggle v-if="!isGameBoard" />
  <RouterView />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ThemeToggle from './components/ui/ThemeToggle.vue'
import { useThemeStore } from './stores/themeStore'

useThemeStore()
const route = useRoute()
const isGameBoard = computed(() => route.path.startsWith('/game/'))
</script>
