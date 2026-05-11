<template>
  <div class="code-card">
    <p class="card-hint">Share this code with players</p>
    <div class="code-row">
      <span class="code-text">{{ code || '——————' }}</span>
      <button @click="copyCode" class="copy-btn" title="Copy code">
        <Check v-if="copied" :size="20" class="text-green-500" />
        <ClipboardCopy v-else :size="20" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ClipboardCopy, Check } from 'lucide-vue-next'

const props = defineProps<{ code: string }>()
const copied = ref(false)

async function copyCode() {
  if (!props.code) return
  await navigator.clipboard.writeText(props.code)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<style scoped>
.code-card {
  @apply bg-gray-900 rounded-lg p-6 space-y-3;
}
.card-hint {
  @apply text-sm text-gray-400;
}
.code-row {
  @apply flex items-center justify-between gap-3;
}
.code-text {
  @apply text-3xl font-mono font-bold tracking-widest text-white;
}
.copy-btn {
  @apply text-gray-400 hover:text-white transition-colors;
}
</style>
