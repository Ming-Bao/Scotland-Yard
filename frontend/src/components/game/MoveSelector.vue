<template>
  <div class="move-section">
    <template v-if="selectedNode">
      <p class="section-label">Move to</p>
      <p class="node-name">{{ selectedNode.label }}</p>
      <p class="node-id">Node {{ selectedNode.id }}</p>

      <template v-if="reachable">
        <p class="ticket-prompt">Choose ticket</p>
        <div class="ticket-buttons">
          <button
            v-for="mode in availableModes"
            :key="mode"
            class="ticket-btn"
            :class="{ 'ticket-btn--selected': selectedTicket === mode }"
            :style="{ borderColor: modeColor(mode), color: modeColor(mode) }"
            @click="$emit('select-ticket', mode)"
          >{{ modeLabel(mode) }}</button>
        </div>
        <p v-if="moveError" class="move-error-msg">{{ moveError }}</p>
        <button
          :disabled="!selectedTicket || submitting"
          class="confirm-btn"
          @click="$emit('confirm')"
        >{{ submitting ? 'Moving…' : 'Confirm Move' }}</button>
      </template>

      <template v-else>
        <p class="no-connection">No direct connection from your position</p>
      </template>
    </template>

    <template v-else>
      <p class="section-label">Move</p>
      <p class="move-hint">Click a node on the map to select a destination</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { GraphNode } from '../../types/game'
import { modeColor, modeLabel } from '../../utils/transportModes'

defineProps<{
  selectedNode: GraphNode | null
  availableModes: string[]
  selectedTicket: string | null
  reachable: boolean
  submitting: boolean
  moveError: string | null
}>()

defineEmits<{
  'select-ticket': [mode: string]
  confirm: []
}>()
</script>

<style scoped>
@reference "tailwindcss";
@variant dark (&:is(.dark *));

.move-section {
  @apply p-4;
}
.section-label {
  @apply text-sm text-gray-500 uppercase tracking-wider mb-1;
}
.node-name {
  @apply text-gray-900 dark:text-white font-medium text-base mb-1;
}
.node-id {
  @apply text-sm text-gray-500 font-mono mb-3;
}
.ticket-prompt {
  @apply text-sm text-gray-500 mb-2;
}
.ticket-buttons {
  @apply flex flex-wrap gap-2 mb-3;
}
.ticket-btn {
  @apply px-3 py-2 rounded-lg text-sm font-semibold border bg-transparent
         hover:bg-black/5 dark:hover:bg-white/5 transition-colors;
}
.ticket-btn--selected {
  @apply bg-black/10 dark:bg-white/10;
}
.confirm-btn {
  @apply w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed
         text-white text-base font-medium py-2.5 rounded-lg transition-colors;
}
.move-error-msg {
  @apply text-sm text-red-500 mb-2;
}
.no-connection {
  @apply text-sm text-gray-600 italic;
}
.move-hint {
  @apply text-sm text-gray-600 italic;
}
</style>
