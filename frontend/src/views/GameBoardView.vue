<template>
  <div class="h-screen bg-gray-950 flex flex-col overflow-hidden">

    <!-- Header -->
    <div class="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <RouterLink to="/" class="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft :size="18" />
        </RouterLink>
        <h1 class="text-white font-bold">Scotland Yard</h1>
        <span class="text-gray-600 text-sm font-mono">Wellington Edition</span>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-gray-400 text-sm">Round <span class="text-white font-mono">1</span> / 24</span>
        <span class="bg-blue-600/20 text-blue-400 text-sm px-3 py-1 rounded-full">Mr X Turn</span>
      </div>
    </div>

    <!-- Body -->
    <div class="flex flex-1 overflow-hidden">

      <!-- Map panel -->
      <div class="flex-1 relative bg-gray-950 overflow-hidden">
        <svg
          viewBox="0 0 600 440"
          class="w-full h-full"
          @click.self="selectedNode = null"
        >
          <!-- Edges -->
          <g v-for="edge in edges" :key="`${edge.from}-${edge.to}`">
            <line
              :x1="nodeById(edge.from).x" :y1="nodeById(edge.from).y"
              :x2="nodeById(edge.to).x"   :y2="nodeById(edge.to).y"
              :stroke="modeColor(edge.modes[0])" stroke-width="3" stroke-opacity="0.5"
              stroke-linecap="round"
            />
            <!-- Mode label at midpoint -->
            <text
              :x="(nodeById(edge.from).x + nodeById(edge.to).x) / 2"
              :y="(nodeById(edge.from).y + nodeById(edge.to).y) / 2 - 6"
              text-anchor="middle" font-size="8" font-family="sans-serif"
              :fill="modeColor(edge.modes[0])" fill-opacity="0.8"
            >{{ edge.modes.map(modeLabel).join('/') }}</text>
          </g>

          <!-- Nodes -->
          <g
            v-for="node in nodes" :key="node.id"
            class="cursor-pointer"
            @click.stop="selectNode(node)"
          >
            <!-- Selection ring -->
            <circle
              v-if="selectedNode?.id === node.id"
              :cx="node.x" :cy="node.y" r="24"
              fill="none" stroke="white" stroke-width="2" opacity="0.7"
            />
            <!-- Reachable highlight -->
            <circle
              v-if="isReachable(node.id)"
              :cx="node.x" :cy="node.y" r="20"
              fill="white" fill-opacity="0.08"
            />
            <!-- Node body -->
            <circle
              :cx="node.x" :cy="node.y" r="16"
              :fill="playerNode === node.id ? '#2563eb' : '#1f2937'"
              :stroke="selectedNode?.id === node.id ? '#fff' : '#4b5563'"
              stroke-width="1.5"
            />
            <!-- Node number -->
            <text
              :x="node.x" :y="node.y"
              text-anchor="middle" dominant-baseline="middle"
              font-size="11" font-family="monospace" font-weight="600"
              fill="white"
            >{{ node.id }}</text>
            <!-- Node label below -->
            <text
              :x="node.x" :y="node.y + 28"
              text-anchor="middle"
              font-size="9" font-family="sans-serif"
              fill="#6b7280"
            >{{ node.label }}</text>
          </g>
        </svg>

        <!-- Map legend -->
        <div class="absolute bottom-3 left-3 flex gap-3">
          <div v-for="m in modeLegend" :key="m.mode" class="flex items-center gap-1">
            <div class="w-3 h-0.5 rounded-full" :style="{ backgroundColor: m.color }"></div>
            <span class="text-xs" :style="{ color: m.color }">{{ m.label }}</span>
          </div>
        </div>
      </div>

      <!-- Info panel -->
      <div class="w-72 bg-gray-900 border-l border-gray-800 flex flex-col overflow-y-auto shrink-0">

        <!-- Players -->
        <div class="p-4 border-b border-gray-800">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-3">Players</p>
          <div v-for="player in demoPlayers" :key="player.name" class="flex items-center justify-between py-1.5">
            <div class="flex items-center gap-2">
              <div class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: player.color }"></div>
              <span class="text-sm text-white">{{ player.name }}</span>
              <span v-if="player.isYou" class="text-xs text-gray-600">(you)</span>
            </div>
            <span class="text-xs text-gray-500 font-mono">
              {{ player.role === 'MR_X' ? '?' : `Node ${player.node}` }}
            </span>
          </div>
        </div>

        <!-- Tickets -->
        <div class="p-4 border-b border-gray-800">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-3">Your Tickets</p>
          <div class="grid grid-cols-2 gap-2">
            <div v-for="ticket in demoTickets" :key="ticket.type"
              class="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2"
            >
              <span class="text-xs font-medium" :style="{ color: ticket.color }">{{ ticket.label }}</span>
              <span class="text-white text-sm font-mono font-bold">{{ ticket.count }}</span>
            </div>
          </div>
        </div>

        <!-- Mr X log -->
        <div class="p-4 border-b border-gray-800">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-3">Mr X Log</p>
          <div v-if="mrXLog.length === 0" class="text-xs text-gray-600 italic">No moves yet</div>
          <div v-for="entry in mrXLog" :key="entry.round" class="flex items-center justify-between py-1">
            <span class="text-xs text-gray-500">Round {{ entry.round }}</span>
            <span class="text-xs font-medium" :style="{ color: modeColor(entry.ticket) }">{{ modeLabel(entry.ticket) }}</span>
            <span class="text-xs text-gray-400 font-mono">{{ entry.node ?? '?' }}</span>
          </div>
        </div>

        <!-- Move selection -->
        <div class="p-4">
          <template v-if="selectedNode">
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Move to</p>
            <p class="text-white font-medium mb-1">{{ selectedNode.label }}</p>
            <p class="text-xs text-gray-500 font-mono mb-3">Node {{ selectedNode.id }}</p>

            <template v-if="edgeTo(selectedNode.id)">
              <p class="text-xs text-gray-500 mb-2">Choose ticket</p>
              <div class="flex flex-wrap gap-2 mb-3">
                <button
                  v-for="mode in edgeTo(selectedNode.id)!.modes"
                  :key="mode"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                  :style="{
                    borderColor: modeColor(mode),
                    color: modeColor(mode),
                  }"
                  @click="selectedTicket = mode"
                  :class="selectedTicket === mode ? 'bg-white/10' : 'bg-transparent hover:bg-white/5'"
                >{{ modeLabel(mode) }}</button>
              </div>
              <button
                :disabled="!selectedTicket"
                class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors"
                @click="confirmMove"
              >Confirm Move</button>
            </template>
            <template v-else>
              <p class="text-xs text-gray-600 italic">No direct connection from your position</p>
            </template>
          </template>
          <template v-else>
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-2">Move</p>
            <p class="text-xs text-gray-600 italic">Click a node on the map to select a destination</p>
          </template>
        </div>

        <!-- Leave -->
        <div class="p-4 mt-auto border-t border-gray-800">
          <button
            @click="handleLeave"
            class="w-full bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >Leave Game</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { useGameStore } from '../stores/gameStore'
import { leaveGame } from '../api/gameApi'

const router = useRouter()
const store = useGameStore()

// --- Hardcoded demo graph (Sprint 2 — no backend integration) ---

interface DemoNode { id: number; x: number; y: number; label: string }
interface DemoEdge { from: number; to: number; modes: string[] }

const nodes: DemoNode[] = [
  { id: 1, x: 120, y: 180, label: 'Lambton Quay' },
  { id: 2, x: 280, y: 110, label: 'Wellington Station' },
  { id: 3, x: 440, y: 150, label: 'Thorndon' },
  { id: 4, x: 420, y: 300, label: 'Mt Victoria' },
  { id: 5, x: 260, y: 340, label: 'Courtenay Pl' },
  { id: 6, x: 130, y: 320, label: 'Newtown' },
  { id: 7, x: 310, y: 220, label: 'Te Aro' },
]

const edges: DemoEdge[] = [
  { from: 1, to: 2, modes: ['TRAIN', 'BUS'] },
  { from: 2, to: 3, modes: ['TRAIN'] },
  { from: 3, to: 4, modes: ['BUS', 'ESCOOTER'] },
  { from: 4, to: 5, modes: ['ESCOOTER'] },
  { from: 5, to: 6, modes: ['BUS'] },
  { from: 6, to: 1, modes: ['ESCOOTER', 'FERRY'] },
  { from: 1, to: 7, modes: ['BUS'] },
  { from: 7, to: 5, modes: ['BUS', 'ESCOOTER'] },
  { from: 2, to: 7, modes: ['ESCOOTER'] },
  { from: 7, to: 4, modes: ['BUS'] },
]

const MODE_COLORS: Record<string, string> = {
  ESCOOTER: '#f59e0b',
  BUS:      '#ef4444',
  TRAIN:    '#f97316',
  FERRY:    '#06b6d4',
  BLACK:    '#a855f7',
}

const modeLegend = [
  { mode: 'ESCOOTER', label: 'Escooter', color: MODE_COLORS.ESCOOTER },
  { mode: 'BUS',      label: 'Bus',      color: MODE_COLORS.BUS },
  { mode: 'TRAIN',    label: 'Train',    color: MODE_COLORS.TRAIN },
  { mode: 'FERRY',    label: 'Ferry',    color: MODE_COLORS.FERRY },
]

function modeColor(mode: string) { return MODE_COLORS[mode] ?? '#6b7280' }
function modeLabel(mode: string) {
  return { ESCOOTER: 'Escooter', BUS: 'Bus', TRAIN: 'Train', FERRY: 'Ferry', BLACK: 'Black' }[mode] ?? mode
}
function nodeById(id: number) { return nodes.find(n => n.id === id)! }

// --- Player state ---

const playerNode = ref(1)
const selectedNode = ref<DemoNode | null>(null)
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

const mrXLog: { round: number; ticket: string; node: number | null }[] = []

// Edge directly connecting playerNode to a given node (undirected)
function edgeTo(targetId: number): DemoEdge | undefined {
  return edges.find(e =>
    (e.from === playerNode.value && e.to === targetId) ||
    (e.to === playerNode.value && e.from === targetId)
  )
}

function isReachable(nodeId: number): boolean {
  return nodeId !== playerNode.value && !!edgeTo(nodeId)
}

function selectNode(node: DemoNode) {
  if (node.id === playerNode.value) return
  selectedNode.value = node
  selectedTicket.value = null
}

function confirmMove() {
  if (!selectedNode.value || !selectedTicket.value) return
  playerNode.value = selectedNode.value.id
  selectedNode.value = null
  selectedTicket.value = null
}

// --- Leave ---

async function handleLeave() {
  const { gameId, playerId } = store
  if (gameId && playerId && gameId !== 'preview') {
    try { await leaveGame(gameId, playerId) } catch { /* ignore */ }
  }
  store.clearGame()
  router.push('/')
}
</script>
