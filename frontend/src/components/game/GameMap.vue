<template>
  <div class="map-panel">
    <svg viewBox="0 0 600 440" class="map-svg" @click.self="$emit('select-node', null)">
      <!-- Edges -->
      <g v-for="edge in edges" :key="`${edge.from}-${edge.to}`">
        <line
          :x1="nodeById(edge.from).x" :y1="nodeById(edge.from).y"
          :x2="nodeById(edge.to).x"   :y2="nodeById(edge.to).y"
          :stroke="modeColor(edge.modes[0])" stroke-width="3" stroke-opacity="0.5"
          stroke-linecap="round"
        />
        <text
          :x="(nodeById(edge.from).x + nodeById(edge.to).x) / 2"
          :y="(nodeById(edge.from).y + nodeById(edge.to).y) / 2 - 6"
          text-anchor="middle" font-size="8" font-family="sans-serif"
          :fill="modeColor(edge.modes[0])" fill-opacity="0.8"
        >{{ edge.modes.map(modeLabel).join('/') }}</text>
      </g>

      <!-- Nodes -->
      <g
        v-for="node in nodes"
        :key="node.id"
        class="cursor-pointer"
        @click.stop="$emit('select-node', node)"
      >
        <circle
          v-if="selectedNode?.id === node.id"
          :cx="node.x" :cy="node.y" r="24"
          fill="none" stroke="white" stroke-width="2" opacity="0.7"
        />
        <circle
          v-if="isReachable(node.id)"
          :cx="node.x" :cy="node.y" r="20"
          fill="white" fill-opacity="0.08"
        />
        <circle
          :cx="node.x" :cy="node.y" r="16"
          :fill="playerNode === node.id ? '#2563eb' : '#1f2937'"
          :stroke="selectedNode?.id === node.id ? '#fff' : '#4b5563'"
          stroke-width="1.5"
        />
        <text
          :x="node.x" :y="node.y"
          text-anchor="middle" dominant-baseline="middle"
          font-size="11" font-family="monospace" font-weight="600"
          fill="white"
        >{{ node.id }}</text>
        <text
          :x="node.x" :y="node.y + 28"
          text-anchor="middle"
          font-size="9" font-family="sans-serif"
          fill="#6b7280"
        >{{ node.label }}</text>
      </g>
    </svg>

    <!-- Legend -->
    <div class="legend">
      <div v-for="m in modeLegend" :key="m.mode" class="legend-item">
        <div class="legend-line" :style="{ backgroundColor: m.color }"></div>
        <span class="legend-label" :style="{ color: m.color }">{{ m.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GraphNode, GraphEdge } from '../../types/game'
import { modeColor, modeLabel, modeLegend } from '../../utils/transportModes'

const props = defineProps<{
  nodes: GraphNode[]
  edges: GraphEdge[]
  playerNode: number
  selectedNode: GraphNode | null
}>()

defineEmits<{ 'select-node': [node: GraphNode | null] }>()

function nodeById(id: number): GraphNode {
  return props.nodes.find(n => n.id === id)!
}

function isReachable(nodeId: number): boolean {
  if (nodeId === props.playerNode) return false
  return props.edges.some(e =>
    (e.from === props.playerNode && e.to === nodeId) ||
    (e.to === props.playerNode && e.from === nodeId)
  )
}
</script>

<style scoped>
.map-panel {
  @apply flex-1 relative bg-gray-950 overflow-hidden;
}
.map-svg {
  @apply w-full h-full;
}
.legend {
  @apply absolute bottom-3 left-3 flex gap-3;
}
.legend-item {
  @apply flex items-center gap-1;
}
.legend-line {
  @apply w-3 h-0.5 rounded-full;
}
.legend-label {
  @apply text-xs;
}
</style>
