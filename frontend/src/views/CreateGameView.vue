<template>
  <div class="min-h-screen bg-gray-950 flex items-center justify-center px-4">
    <div class="w-full max-w-md space-y-6">
      <div class="flex items-center gap-3">
        <RouterLink to="/" class="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft :size="20" />
        </RouterLink>
        <h1 class="text-2xl font-bold text-white">Create Game</h1>
      </div>

      <div class="bg-gray-900 rounded-lg p-6 space-y-4">
        <div class="space-y-1">
          <label class="text-sm text-gray-400">Your Name</label>
          <input
            v-model="hostName"
            type="text"
            placeholder="Enter your name"
            class="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-500"
          />
        </div>

        <div class="space-y-1">
          <label class="text-sm text-gray-400">Max Players</label>
          <select
            v-model="maxPlayers"
            class="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option v-for="n in [2, 3, 4, 5, 6]" :key="n" :value="n">{{ n }} players</option>
          </select>
        </div>

        <div v-if="error" class="bg-red-900/20 border border-red-700 text-red-400 rounded-lg px-4 py-2.5 text-sm">
          {{ error }}
        </div>

        <button
          @click="handleCreate"
          :disabled="loading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
        >
          {{ loading ? 'Creating…' : 'Create Game' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { createGame } from '../api/gameApi'
import { useGameStore } from '../stores/gameStore'

const router = useRouter()
const store = useGameStore()

const hostName = ref('')
const maxPlayers = ref(4)
const loading = ref(false)
const error = ref('')

async function handleCreate() {
  if (!hostName.value.trim()) {
    error.value = 'Please enter your name'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await createGame(hostName.value.trim(), maxPlayers.value)
    store.setGame(result.gameState.gameId, result.playerId, result.gameState)
    router.push(`/lobby/${result.gameState.gameId}`)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to create game'
  } finally {
    loading.value = false
  }
}
</script>
