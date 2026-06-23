<template>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <RouterLink to="/" class="back-btn">
          <ArrowLeft :size="18" />
        </RouterLink>
        <h1 class="game-title">Scotland Yard</h1>
        <span class="game-subtitle">Wellington Edition</span>
      </div>
      <div class="header-right">
        <span class="round-label">Round <span class="round-num">1</span> / 24</span>
        <span class="turn-badge">Mr X Turn</span>
      </div>
    </div>

    <!-- Map load error -->
    <div v-if="mapError" class="map-error">{{ mapError }}</div>

    <!-- Body -->
    <div class="body">
      <GameMap
        :nodes="nodes"
        :edges="edges"
        :player-node="playerNode"
        :selected-node="selectedNode"
        @select-node="handleSelectNode"
      />

      <InfoPanel
        :players="demoPlayers"
        :tickets="demoTickets"
        :mr-x-log="mrXLog"
        :selected-node="selectedNode"
        :selected-ticket="selectedTicket"
        :available-modes="availableModes"
        :reachable="reachable"
        @select-ticket="selectedTicket = $event"
        @confirm-move="confirmMove"
        @leave="handleLeave"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'
import { leaveGame, getMap } from '../api/gameApi'
import type { GraphNode, GraphEdge, MrXLogEntry } from '../types/game'
import { MODE_COLORS } from '../utils/transportModes'
import GameMap from '../components/game/GameMap.vue'
import InfoPanel from '../components/game/InfoPanel.vue'

const router = useRouter()
const store = useGameStore()

// --- Map data ---

const nodes = ref<GraphNode[]>([])
const edges = ref<GraphEdge[]>([])
const mapError = ref<string | null>(null)

onMounted(async () => {
  try {
    const map = await getMap()
    nodes.value = map.nodes
    edges.value = map.edges
    if (map.nodes.length > 0) playerNode.value = map.nodes[0].id
  } catch (e) {
    mapError.value = e instanceof Error ? e.message : 'Failed to load map'
  }
})

// --- Player state ---

const playerNode = ref(0)
const selectedNode = ref<GraphNode | null>(null)
const selectedTicket = ref<string | null>(null)

const demoPlayers = [
  { name: store.gameState?.players.find(p => p.id === store.playerId)?.name ?? 'You', isYou: true, role: 'DETECTIVE', node: playerNode.value, color: '#2563eb' },
  { name: 'Mr X', isYou: false, role: 'MR_X', node: null, color: '#ef4444' },
]

const demoTickets = computed(() => [
  { type: 'ESCOOTER', label: 'Escooter', count: 10, color: MODE_COLORS.ESCOOTER },
  { type: 'BUS',      label: 'Bus',      count: 8,  color: MODE_COLORS.BUS },
  { type: 'TRAIN',    label: 'Train',    count: 4,  color: MODE_COLORS.TRAIN },
  { type: 'FERRY',    label: 'Ferry',    count: 2,  color: MODE_COLORS.FERRY },
])

const mrXLog: MrXLogEntry[] = []

function edgeTo(targetId: number | undefined): GraphEdge | undefined {
  if (targetId == null) return undefined
  return edges.value.find(e =>
    (e.from === playerNode.value && e.to === targetId) ||
    (e.to === playerNode.value && e.from === targetId)
  )
}

const currentEdge = computed(() => edgeTo(selectedNode.value?.id))
const reachable = computed(() => !!currentEdge.value)
const availableModes = computed(() => currentEdge.value?.modes ?? [])

function handleSelectNode(node: GraphNode | null) {
  if (node?.id === playerNode.value) return
  selectedNode.value = node
  selectedTicket.value = null
}

function confirmMove() {
  if (!selectedNode.value || !selectedTicket.value) return
  playerNode.value = selectedNode.value.id
  selectedNode.value = null
  selectedTicket.value = null
}

async function handleLeave() {
  const { gameId, playerId } = store
  if (gameId && playerId && gameId !== 'preview') {
    try { await leaveGame(gameId, playerId) } catch { /* ignore */ }
  }
  store.clearGame()
  router.push('/')
}
</script>

<style scoped>
@reference "tailwindcss";
@variant dark (&:is(.dark *));

.page {
  @apply h-screen bg-gray-50 dark:bg-gray-950 flex flex-col overflow-hidden;
}
.header {
  @apply bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between shrink-0;
}
.header-left {
  @apply flex items-center gap-3;
}
.back-btn {
  @apply text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors;
}
.game-title {
  @apply text-gray-900 dark:text-white font-bold;
}
.game-subtitle {
  @apply text-gray-500 dark:text-gray-600 text-sm font-mono;
}
.header-right {
  @apply flex items-center gap-4;
}
.round-label {
  @apply text-gray-600 dark:text-gray-400 text-sm;
}
.round-num {
  @apply text-gray-900 dark:text-white font-mono;
}
.turn-badge {
  @apply bg-blue-600/20 text-blue-400 text-sm px-3 py-1 rounded-full;
}
.body {
  @apply flex flex-1 overflow-hidden;
}
.map-error {
  @apply bg-red-900/20 border-b border-red-700 text-red-400 text-sm px-4 py-2;
}
</style>
