<template>
  <div class="header">
    <button @click="$emit('back')" class="back-btn">
      <ArrowLeft :size="20" />
    </button>
    <h1 class="title">{{ title }}</h1>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
defineProps<{ title: string }>()
defineEmits<{ back: [] }>()
</script>

<style scoped>
@reference "tailwindcss";

.header {
  @apply flex items-center gap-3;
}
.back-btn {
  @apply text-gray-400 hover:text-white transition-colors;
}
.title {
  @apply text-2xl font-bold text-white;
}
</style>
