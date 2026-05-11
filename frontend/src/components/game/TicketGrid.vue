<template>
  <div class="ticket-section">
    <p class="section-label">Your Tickets</p>
    <div class="ticket-grid">
      <div v-for="ticket in tickets" :key="ticket.type" class="ticket-pill">
        <span class="ticket-name" :style="{ color: ticket.color }">{{ ticket.label }}</span>
        <span class="ticket-count">{{ ticket.count }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DemoTicket } from '../../types/game'
defineProps<{ tickets: DemoTicket[] }>()
</script>

<style scoped>
@reference "tailwindcss";

.ticket-section {
  @apply p-4 border-b border-gray-800;
}
.section-label {
  @apply text-xs text-gray-500 uppercase tracking-wider mb-3;
}
.ticket-grid {
  @apply grid grid-cols-2 gap-2;
}
.ticket-pill {
  @apply flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2;
}
.ticket-name {
  @apply text-xs font-medium;
}
.ticket-count {
  @apply text-white text-sm font-mono font-bold;
}
</style>
