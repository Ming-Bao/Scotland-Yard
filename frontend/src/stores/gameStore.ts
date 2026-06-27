import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameStateDTO, ValidMoveDTO } from '../types/game'

export const useGameStore = defineStore('game', () => {
  const gameId   = ref<string | null>(sessionStorage.getItem('gameId'))
  const playerId = ref<string | null>(sessionStorage.getItem('playerId'))
  const gameState  = ref<GameStateDTO | null>(null)
  const validMoves = ref<ValidMoveDTO[]>([])

  function setGame(newGameId: string, newPlayerId: string, state: GameStateDTO) {
    gameId.value   = newGameId
    playerId.value = newPlayerId
    gameState.value = state
    sessionStorage.setItem('gameId', newGameId)
    sessionStorage.setItem('playerId', newPlayerId)
  }

  function updateGameState(state: GameStateDTO) {
    gameState.value = state
    // Clear valid moves when it stops being our turn
    if (state.currentPlayerId !== playerId.value) {
      validMoves.value = []
    }
  }

  function setValidMoves(moves: ValidMoveDTO[]) {
    validMoves.value = moves
  }

  function clearGame() {
    gameId.value    = null
    playerId.value  = null
    gameState.value = null
    validMoves.value = []
    sessionStorage.removeItem('gameId')
    sessionStorage.removeItem('playerId')
  }

  const isMyTurn = computed(() =>
    !!playerId.value &&
    gameState.value?.currentPlayerId === playerId.value &&
    gameState.value?.phase === 'IN_PROGRESS'
  )

  const myPlayer = computed(() =>
    gameState.value?.players.find(p => p.id === playerId.value) ?? null
  )

  const myRole = computed(() => myPlayer.value?.role ?? null)

  const isMrX = computed(() => myRole.value === 'MR_X')

  return { gameId, playerId, gameState, validMoves, setGame, updateGameState, setValidMoves, clearGame, isMyTurn, myPlayer, myRole, isMrX }
})
