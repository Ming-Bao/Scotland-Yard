<template>
  <div class="log-section">
    <p class="section-label">Mr X Log</p>
    <div v-if="log.length === 0" class="log-empty">No moves yet</div>
    <div v-for="(entry, i) in log" :key="i" class="log-row">
      <span class="log-round">R{{ entry.round }}<span v-if="entry.leg === 2" class="log-leg">b</span></span>
      <span class="log-ticket" :style="{ color: modeColor(entry.ticketUsed) }">{{ modeLabel(entry.ticketUsed) }}</span>
      <span class="log-node">{{ entry.nodeId ?? '?' }}</span>
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
@variant dark (&:is(.dark *));

.log-section {
  @apply p-4 border-b border-gray-200 dark:border-gray-800;
}
.section-label {
  @apply text-sm text-gray-500 uppercase tracking-wider mb-3;
}
.log-empty {
  @apply text-sm text-gray-600 italic;
}
.log-row {
  @apply flex items-center justify-between py-1.5;
}
.log-round {
  @apply text-sm text-gray-500;
}
.log-ticket {
  @apply text-sm font-medium;
}
.log-leg {
  @apply text-gray-400 ml-0.5;
}
.log-node {
  @apply text-sm text-gray-500 dark:text-gray-400 font-mono;
}
</style>
