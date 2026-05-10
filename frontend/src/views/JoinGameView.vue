<template>
  <div class="min-h-screen bg-gray-950 flex items-center justify-center px-4">
    <div class="w-full max-w-md space-y-6">
      <div class="flex items-center gap-3">
        <RouterLink to="/" class="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft :size="20" />
        </RouterLink>
        <h1 class="text-2xl font-bold text-white">Join Game</h1>
      </div>

      <div class="bg-gray-900 rounded-lg p-6 space-y-4">
        <div class="space-y-1">
          <label class="text-sm text-gray-400">Your Name</label>
          <input
            v-model="playerName"
            type="text"
            placeholder="Enter your name"
            class="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-500"
          />
        </div>

        <div class="space-y-1">
          <label class="text-sm text-gray-400">Game Code</label>
          <input
            v-model="joinCode"
            type="text"
            placeholder="XXXXXX"
            maxlength="6"
            class="w-full bg-gray-800 text-white font-mono text-xl tracking-widest rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-500 uppercase"
            @input="joinCode = ($event.target as HTMLInputElement).value.toUpperCase()"
          />
        </div>

        <div
          v-if="error"
          class="bg-red-900/20 border border-red-700 text-red-400 rounded-lg px-4 py-2.5 text-sm"
        >
          {{ error }}
        </div>

        <button
          @click="handleJoin"
          :disabled="loading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
        >
          {{ loading ? 'Joining…' : 'Join Game' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { joinGame } from '../api/gameApi'
import { useGameStore } from '../stores/gameStore'

const router = useRouter()
const store = useGameStore()

const playerName = ref('')
const joinCode = ref('')
const loading = ref(false)
const error = ref('')

async function handleJoin() {
  if (!playerName.value.trim()) {
    error.value = 'Please enter your name'
    return
  }
  if (joinCode.value.length !== 6) {
    error.value = 'Game code must be 6 characters'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await joinGame(joinCode.value, playerName.value.trim())
    store.setGame(result.gameState.gameId, result.playerId, result.gameState)
    router.push(`/lobby/${result.gameState.gameId}`)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to join game'
  } finally {
    loading.value = false
  }
}
</script>
