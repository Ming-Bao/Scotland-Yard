export type TicketType = 'ESCOOTER' | 'BUS' | 'TRAIN' | 'FERRY' | 'BLACK' | 'DOUBLE'

// Graph / demo types (Sprint 2 — replaced by real game state in Sprint 3)
export interface GraphNode { id: number; lat: number; lng: number; label: string }
export interface GraphEdge { from: number; to: number; modes: string[]; coordinates?: [number, number][] }
export interface DemoPlayer { name: string; isYou: boolean; role: string; node: number | null; color: string }
export interface DemoTicket { type: string; label: string; count: number; color: string }
export interface MrXLogEntry { round: number; ticket: string; node: number | null }
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
