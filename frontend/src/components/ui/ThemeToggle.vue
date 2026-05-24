<template>
  <button
    @click="theme.toggle()"
    class="toggle-btn"
    :title="theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <Sun v-if="theme.isDark" :size="18" />
    <Moon v-else :size="18" />
  </button>
</template>

<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'
import { useThemeStore } from '../../stores/themeStore'
const theme = useThemeStore()
</script>

<style scoped>
@reference "tailwindcss";
@variant dark (&:is(.dark *));

.toggle-btn {
  @apply fixed top-4 right-4 z-50 p-2 rounded-lg
         bg-gray-100 dark:bg-gray-800
         text-gray-600 dark:text-gray-400
         hover:text-gray-900 dark:hover:text-white
         transition-colors;
}
</style>
