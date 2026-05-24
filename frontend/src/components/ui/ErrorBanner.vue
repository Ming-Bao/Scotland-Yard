<template>
  <div v-if="message" class="error-banner">
    {{ message }}
  </div>
</template>

<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<style scoped>
@reference "tailwindcss";
@variant dark (&:is(.dark *));

.error-banner {
  @apply bg-red-900/20 border border-red-700 text-red-400 rounded-lg px-4 py-2.5 text-sm;
}
</style>
