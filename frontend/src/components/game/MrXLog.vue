<template>
  <div class="log-section">
    <p class="section-label">Mr X Log</p>
    <div v-if="log.length === 0" class="log-empty">No moves yet</div>
    <div v-for="entry in log" :key="entry.round" class="log-row">
      <span class="log-round">Round {{ entry.round }}</span>
      <span class="log-ticket" :style="{ color: modeColor(entry.ticket) }">{{ modeLabel(entry.ticket) }}</span>
      <span class="log-node">{{ entry.node ?? '?' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MrXLogEntry } from '../../types/game'
import { modeColor, modeLabel } from '../../utils/transportModes'

defineProps<{ log: MrXLogEntry[] }>()
</script>

<style scoped>
@reference "tailwindcss";

.log-section {
  @apply p-4 border-b border-gray-800;
}
.section-label {
  @apply text-xs text-gray-500 uppercase tracking-wider mb-3;
}
.log-empty {
  @apply text-xs text-gray-600 italic;
}
.log-row {
  @apply flex items-center justify-between py-1;
}
.log-round {
  @apply text-xs text-gray-500;
}
.log-ticket {
  @apply text-xs font-medium;
}
.log-node {
  @apply text-xs text-gray-400 font-mono;
}
</style>
