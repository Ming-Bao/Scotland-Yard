<template>
  <div class="info-panel">
    <!-- Players -->
    <div class="panel-section">
      <p class="section-label">Players</p>
      <div v-for="player in players" :key="player.name" class="player-row">
        <div class="player-info">
          <div class="player-dot" :style="{ backgroundColor: player.color }"></div>
          <span class="player-name">{{ player.name }}</span>
          <span v-if="player.isYou" class="player-you">(you)</span>
        </div>
        <span class="player-location">
          {{ player.role === 'MR_X' ? '?' : `Node ${player.node}` }}
        </span>
      </div>
    </div>

    <!-- Tickets -->
    <TicketGrid :tickets="tickets" />

    <!-- Mr X Log -->
    <MrXLog :log="mrXLog" />

    <!-- Move selector -->
    <MoveSelector
      :selected-node="selectedNode"
      :available-modes="availableModes"
      :selected-ticket="selectedTicket"
      :reachable="reachable"
      @select-ticket="$emit('select-ticket', $event)"
      @confirm="$emit('confirm-move')"
    />

    <!-- Leave -->
    <div class="leave-section">
      <button @click="$emit('leave')" class="leave-btn">Leave Game</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GraphNode, DemoPlayer, DemoTicket, MrXLogEntry } from '../../types/game'
import TicketGrid from './TicketGrid.vue'
import MrXLog from './MrXLog.vue'
import MoveSelector from './MoveSelector.vue'

defineProps<{
  players: DemoPlayer[]
  tickets: DemoTicket[]
  mrXLog: MrXLogEntry[]
  selectedNode: GraphNode | null
  selectedTicket: string | null
  availableModes: string[]
  reachable: boolean
}>()

defineEmits<{
  'select-ticket': [mode: string]
  'confirm-move': []
  leave: []
}>()
</script>

<style scoped>
@reference "tailwindcss";
@variant dark (&:is(.dark *));

.info-panel {
  @apply w-72 bg-gray-100 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col overflow-y-auto shrink-0;
}
.panel-section {
  @apply p-4 border-b border-gray-200 dark:border-gray-800;
}
.section-label {
  @apply text-xs text-gray-500 uppercase tracking-wider mb-3;
}
.player-row {
  @apply flex items-center justify-between py-1.5;
}
.player-info {
  @apply flex items-center gap-2;
}
.player-dot {
  @apply w-2.5 h-2.5 rounded-full;
}
.player-name {
  @apply text-sm text-gray-900 dark:text-white;
}
.player-you {
  @apply text-xs text-gray-500 dark:text-gray-600;
}
.player-location {
  @apply text-xs text-gray-500 font-mono;
}
.leave-section {
  @apply p-4 mt-auto border-t border-gray-200 dark:border-gray-800;
}
.leave-btn {
  @apply w-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700
         text-gray-800 dark:text-white text-sm font-medium py-2 rounded-lg transition-colors;
}
</style>
