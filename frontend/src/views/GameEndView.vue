<template>
  <div class="page">
    <div class="content">
      <!-- Trophy icon -->
      <Trophy :size="64" :class="trophyColor" />

      <!-- Winner banner -->
      <div class="banner" :class="bannerClass">
        {{ bannerText }}
      </div>

      <!-- Summary card -->
      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">Game Code</span>
          <span class="summary-value font-mono">{{ gameState?.joinCode ?? '—' }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Rounds Played</span>
          <span class="summary-value">{{ gameState?.round ?? 0 }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Result</span>
          <span class="summary-value">{{ resultText }}</span>
        </div>
      </div>

      <!-- Narrative -->
      <p class="narrative">{{ narrative }}</p>

      <!-- Buttons -->
      <div class="btn-row">
        <RouterLink to="/" class="btn-secondary">Back to Home</RouterLink>
        <RouterLink to="/create" class="btn-primary">Play Again</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Trophy } from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
const gameState = computed(() => store.gameState)
const winner = computed(() => gameState.value?.winner)

const trophyColor = computed(() =>
  winner.value === 'MR_X' ? 'text-red-500' : 'text-blue-500'
)

const bannerClass = computed(() =>
  winner.value === 'MR_X' ? 'banner--mrx' : 'banner--detectives'
)

const bannerText = computed(() => {
  if (winner.value === 'MR_X') return 'Mr. X Escaped!'
  if (winner.value === 'DETECTIVES') return 'Detectives Win!'
  return 'Game Over'
})

const resultText = computed(() => {
  if (winner.value === 'MR_X') return 'Mr. X wins'
  if (winner.value === 'DETECTIVES') return 'Detectives win'
  return gameState.value?.abortReason ?? 'Aborted'
})

const narrative = computed(() => {
  const r = gameState.value?.round ?? 0
  if (winner.value === 'MR_X') return `Mr. X survived all ${r} rounds undetected.`
  if (winner.value === 'DETECTIVES') return `The detectives caught Mr. X on round ${r}.`
  return gameState.value?.abortReason ?? 'The game ended unexpectedly.'
})
</script>

<style scoped>
@reference "tailwindcss";
@variant dark (&:is(.dark *));

.page {
  @apply min-h-screen bg-gray-950 flex items-center justify-center px-4;
}
.content {
  @apply flex flex-col items-center gap-6 w-full max-w-md text-center;
}
.banner {
  @apply w-full text-white font-bold text-lg py-3 rounded-full;
}
.banner--mrx        { @apply bg-red-600; }
.banner--detectives { @apply bg-blue-600; }
.summary-card {
  @apply w-full bg-gray-900 rounded-lg divide-y divide-gray-800;
}
.summary-row {
  @apply flex justify-between items-center px-5 py-3;
}
.summary-label { @apply text-sm text-gray-500; }
.summary-value { @apply text-sm text-white font-medium; }
.narrative {
  @apply text-sm text-gray-400 italic bg-gray-800 rounded-lg px-4 py-3 w-full;
}
.btn-row {
  @apply flex gap-3 w-full;
}
.btn-secondary {
  @apply flex-1 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium text-center transition-colors;
}
.btn-primary {
  @apply flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium text-center transition-colors;
}
</style>
