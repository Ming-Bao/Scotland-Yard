export type TicketType = 'ESCOOTER' | 'BUS' | 'TRAIN' | 'FERRY' | 'BLACK' | 'DOUBLE'
export type GamePhase = 'LOBBY' | 'IN_PROGRESS' | 'PAUSED' | 'ENDED'
export type Role = 'MR_X' | 'DETECTIVE'
export type TurnPhase = 'MR_X_TURN' | 'DETECTIVE_TURN'

export interface PlayerDTO {
  id: string
  name: string
  role: Role | null
  nodeId: number | null
  tickets: Record<TicketType, number> | null
}

export interface GameStateDTO {
  gameId: string
  joinCode: string
  phase: GamePhase
  maxPlayers: number
  players: PlayerDTO[]
  round: number
  turnPhase: TurnPhase | null
  currentPlayerId: string | null
  winner: string | null
  abortReason: string | null
}
