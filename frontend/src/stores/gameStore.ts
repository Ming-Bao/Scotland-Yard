import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GameStateDTO } from '../types/game'

export const useGameStore = defineStore('game', () => {
  const gameId = ref<string | null>(sessionStorage.getItem('gameId'))
  const playerId = ref<string | null>(sessionStorage.getItem('playerId'))
  const gameState = ref<GameStateDTO | null>(null)

  function setGame(newGameId: string, newPlayerId: string, state: GameStateDTO) {
    gameId.value = newGameId
    playerId.value = newPlayerId
    gameState.value = state
    sessionStorage.setItem('gameId', newGameId)
    sessionStorage.setItem('playerId', newPlayerId)
  }

  function updateGameState(state: GameStateDTO) {
    gameState.value = state
  }

  function clearGame() {
    gameId.value = null
    playerId.value = null
    gameState.value = null
    sessionStorage.removeItem('gameId')
    sessionStorage.removeItem('playerId')
  }

  return { gameId, playerId, gameState, setGame, updateGameState, clearGame }
})
