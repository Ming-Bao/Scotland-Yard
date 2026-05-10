<template>
  <div class="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
    <div class="text-center space-y-8 max-w-md w-full">
      <div class="space-y-2">
        <h1 class="text-4xl font-bold text-white">Scotland Yard</h1>
        <p class="text-blue-400 italic text-lg">Wellington Edition</p>
        <p class="text-gray-400 text-sm">Hunt down Mr. X across Wellington's streets</p>
      </div>

      <div class="flex flex-col gap-3">
        <RouterLink
          to="/create"
          class="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          <Users :size="18" />
          Create Game
        </RouterLink>

        <RouterLink
          to="/join"
          class="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          <UserPlus :size="18" />
          Join Game
        </RouterLink>
      </div>
    </div>

    <!-- Dev nav -->
    <div class="absolute bottom-4 left-0 right-0 flex justify-center">
      <div class="border border-gray-800 rounded-lg px-4 py-2 flex items-center gap-1">
        <span class="text-gray-600 text-xs mr-2">dev</span>
        <RouterLink to="/" class="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-800 transition-colors">Landing</RouterLink>
        <RouterLink to="/create" class="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-800 transition-colors">Create</RouterLink>
        <RouterLink to="/join" class="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-800 transition-colors">Join</RouterLink>
        <RouterLink to="/lobby/preview" class="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-800 transition-colors">Lobby</RouterLink>
        <RouterLink to="/game/preview" class="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-800 transition-colors">Game Board</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Users, UserPlus } from 'lucide-vue-next'
</script>
