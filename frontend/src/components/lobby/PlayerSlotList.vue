<template>
  <div class="slot-list">
    <p class="slot-header">Players ({{ players.length }}/{{ maxPlayers }})</p>

    <div v-for="(player, index) in players" :key="player.id" class="player-row">
      <span class="player-name">{{ player.name }}</span>
      <div class="row-right">
        <span v-if="index === 0" class="badge-host">Host</span>
        <span v-else class="badge-ready">Ready</span>
        <button
          v-if="hostPlayerId && player.id !== hostPlayerId"
          class="kick-btn"
          @click="$emit('kick', player.id)"
        >Kick</button>
      </div>
    </div>

    <div v-for="i in emptySlots" :key="'empty-' + i" class="empty-slot">
      Waiting for player…
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PlayerDTO } from '../../types/game'

const props = defineProps<{
  players: PlayerDTO[]
  maxPlayers: number
  hostPlayerId?: string
}>()

defineEmits<{ kick: [playerId: string] }>()

const emptySlots = computed(() => Math.max(0, props.maxPlayers - props.players.length))
</script>

<style scoped>
@reference "tailwindcss";

.slot-list {
  @apply bg-gray-900 rounded-lg p-6 space-y-3;
}
.slot-header {
  @apply text-sm text-gray-400 font-medium;
}
.player-row {
  @apply flex items-center justify-between py-2;
}
.row-right {
  @apply flex items-center gap-2;
}
.player-name {
  @apply text-white;
}
.badge-host {
  @apply text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full;
}
.badge-ready {
  @apply text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full;
}
.kick-btn {
  @apply text-xs text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600
         px-2 py-0.5 rounded transition-colors;
}
.empty-slot {
  @apply border border-dashed border-gray-700 rounded-lg py-2 px-3 text-gray-500 text-sm;
}
</style>
