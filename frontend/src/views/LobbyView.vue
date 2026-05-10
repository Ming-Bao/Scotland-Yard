<template>
  <div class="min-h-screen bg-gray-950 flex items-center justify-center px-4">
    <div class="w-full max-w-md space-y-6">

      <!-- Abort banner -->
      <div
        v-if="aborted"
        class="bg-red-900/20 border border-red-700 rounded-lg px-4 py-4 text-center space-y-2"
      >
        <p class="text-red-400 font-medium">Game ended</p>
        <p class="text-red-300 text-sm">{{ abortMessage }}</p>
        <RouterLink to="/" class="inline-block mt-2 text-sm text-gray-400 hover:text-white transition-colors">
          Back to home
        </RouterLink>
      </div>

      <template v-else>
        <div class="flex items-center gap-3">
          <button @click="handleLeave" class="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft :size="20" />
          </button>
          <h1 class="text-2xl font-bold text-white">Game Lobby</h1>
        </div>

        <!-- Join code -->
        <div class="bg-gray-900 rounded-lg p-6 space-y-3">
          <p class="text-sm text-gray-400">Share this code with players</p>
          <div class="flex items-center justify-between gap-3">
            <span class="text-3xl font-mono font-bold tracking-widest text-white">
              {{ gameState?.joinCode ?? '——————' }}
            </span>
            <button
              @click="copyCode"
              class="text-gray-400 hover:text-white transition-colors"
              title="Copy code"
            >
              <Check v-if="copied" :size="20" class="text-green-500" />
              <ClipboardCopy v-else :size="20" />
            </button>
          </div>
        </div>

        <!-- Player slots -->
        <div class="bg-gray-900 rounded-lg p-6 space-y-3">
          <p class="text-sm text-gray-400 font-medium">
            Players ({{ gameState?.players.length ?? 0 }}/{{ gameState?.maxPlayers ?? '—' }})
          </p>

          <div
            v-for="(player, index) in gameState?.players ?? []"
            :key="player.id"
            class="flex items-center justify-between py-2"
          >
            <span class="text-white">{{ player.name }}</span>
            <span
              v-if="index === 0"
              class="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full"
            >Host</span>
            <span v-else class="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full">
              Ready
            </span>
          </div>

          <div
            v-for="i in emptySlots"
            :key="'empty-' + i"
            class="border border-dashed border-gray-700 rounded-lg py-2 px-3 text-gray-500 text-sm"
          >
            Waiting for player…
          </div>
        </div>

        <!-- Start / waiting -->
        <div v-if="isHost">
          <p v-if="startError" class="text-red-400 text-sm mb-2 text-center">{{ startError }}</p>
          <button
            @click="handleStart"
            :disabled="!canStart || starting"
            class="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
          >
            {{ starting ? 'Starting…' : 'Start Game' }}
          </button>
          <p v-if="!canStart" class="text-gray-600 text-xs text-center mt-2">
            Need at least 2 players to start
          </p>
        </div>
        <div v-else class="text-center text-gray-500 text-sm py-2">
          Waiting for the host to start the game…
        </div>

        <!-- Leave -->
        <button
          @click="handleLeave"
          class="w-full bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          Leave Game
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ClipboardCopy, Check } from 'lucide-vue-next'
import { getGame, startGame, leaveGame } from '../api/gameApi'
import { useGameStore } from '../stores/gameStore'

const route = useRoute()
const router = useRouter()
const store = useGameStore()

const gameId = computed(() => route.params.id as string)
const gameState = computed(() => store.gameState)
const isHost = computed(() => !!store.playerId && store.playerId === store.gameState?.players[0]?.id)
const canStart = computed(() => (gameState.value?.players.length ?? 0) >= 2)
const emptySlots = computed(() => Math.max(0, (gameState.value?.maxPlayers ?? 0) - (gameState.value?.players.length ?? 0)))

const copied = ref(false)
const starting = ref(false)
const startError = ref('')
const aborted = ref(false)
const abortMessage = ref('')

let pollInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // If coming from sessionStorage restore without gameState, fetch once immediately
  if (!store.gameState && store.gameId) {
    fetchState()
  }
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
    // Game may have been deleted (host left)
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

async function copyCode() {
  const code = gameState.value?.joinCode
  if (!code) return
  await navigator.clipboard.writeText(code)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>
