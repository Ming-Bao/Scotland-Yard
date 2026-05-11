<template>
  <div class="page">
    <div class="content">

      <!-- Abort banner -->
      <div v-if="aborted" class="abort-banner">
        <p class="abort-title">Game ended</p>
        <p class="abort-message">{{ abortMessage }}</p>
        <RouterLink to="/" class="abort-link">Back to home</RouterLink>
      </div>

      <template v-else>
        <PageHeader title="Game Lobby" @back="handleLeave" />

        <JoinCodeCard :code="gameState?.joinCode ?? ''" />

        <PlayerSlotList
          :players="gameState?.players ?? []"
          :max-players="gameState?.maxPlayers ?? 0"
        />

        <!-- Start / waiting -->
        <div v-if="isHost" class="start-section">
          <ErrorBanner :message="startError" />
          <button
            @click="handleStart"
            :disabled="!canStart || starting"
            class="btn-start"
          >
            {{ starting ? 'Starting…' : 'Start Game' }}
          </button>
          <p v-if="!canStart" class="start-hint">Need at least 2 players to start</p>
        </div>
        <div v-else class="waiting-text">
          Waiting for the host to start the game…
        </div>

        <button @click="handleLeave" class="btn-leave">Leave Game</button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getGame, startGame, leaveGame } from '../api/gameApi'
import { useGameStore } from '../stores/gameStore'
import PageHeader from '../components/ui/PageHeader.vue'
import ErrorBanner from '../components/ui/ErrorBanner.vue'
import JoinCodeCard from '../components/lobby/JoinCodeCard.vue'
import PlayerSlotList from '../components/lobby/PlayerSlotList.vue'

const route = useRoute()
const router = useRouter()
const store = useGameStore()

const gameId = computed(() => route.params.id as string)
const gameState = computed(() => store.gameState)
const isHost = computed(() => !!store.playerId && store.playerId === store.gameState?.players[0]?.id)
const canStart = computed(() => (gameState.value?.players.length ?? 0) >= 2)

const starting = ref(false)
const startError = ref('')
const aborted = ref(false)
const abortMessage = ref('')

let pollInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (!store.gameState && store.gameId) fetchState()
  if (gameId.value !== 'preview') {
    pollInterval = setInterval(fetchState, 2000)
  }
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

async function fetchState() {
  const id = gameId.value
  if (!id || id === 'preview') return
  try {
    const state = await getGame(id)
    store.updateGameState(state)
    if (state.phase === 'IN_PROGRESS') {
      clearInterval(pollInterval!)
      router.push(`/game/${id}`)
    } else if (state.phase === 'ENDED') {
      clearInterval(pollInterval!)
      aborted.value = true
      abortMessage.value = state.abortReason ?? 'The game has ended'
    }
  } catch {
    clearInterval(pollInterval!)
    aborted.value = true
    abortMessage.value = 'The host has closed the lobby'
  }
}

async function handleStart() {
  if (!store.playerId || !gameId.value) return
  starting.value = true
  startError.value = ''
  try {
    const state = await startGame(gameId.value, store.playerId)
    store.updateGameState(state)
    router.push(`/game/${gameId.value}`)
  } catch (e: unknown) {
    startError.value = e instanceof Error ? e.message : 'Failed to start game'
  } finally {
    starting.value = false
  }
}

async function handleLeave() {
  if (pollInterval) clearInterval(pollInterval)
  const id = gameId.value
  const pid = store.playerId
  if (id && pid && id !== 'preview') {
    try { await leaveGame(id, pid) } catch { /* ignore */ }
  }
  store.clearGame()
  router.push('/')
}
</script>

<style scoped>
@reference "tailwindcss";

.page {
  @apply min-h-screen bg-gray-950 flex items-center justify-center px-4;
}
.content {
  @apply w-full max-w-md space-y-6;
}
.abort-banner {
  @apply bg-red-900/20 border border-red-700 rounded-lg px-4 py-4 text-center space-y-2;
}
.abort-title {
  @apply text-red-400 font-medium;
}
.abort-message {
  @apply text-red-300 text-sm;
}
.abort-link {
  @apply inline-block mt-2 text-sm text-gray-400 hover:text-white transition-colors;
}
.start-section {
  @apply space-y-2;
}
.btn-start {
  @apply w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed
         text-white font-medium py-3 rounded-lg transition-colors;
}
.start-hint {
  @apply text-gray-600 text-xs text-center;
}
.waiting-text {
  @apply text-center text-gray-500 text-sm py-2;
}
.btn-leave {
  @apply w-full bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors;
}
</style>
