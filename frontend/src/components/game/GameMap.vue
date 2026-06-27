<template>
  <div class="map-panel">
    <div ref="mapContainer" class="map-canvas" />
    <div class="legend">
      <div v-for="m in modeLegend" :key="m.mode" class="legend-item">
        <div class="legend-line" :style="{ backgroundColor: m.color }"></div>
        <span class="legend-label" :style="{ color: m.color }">{{ m.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { GraphNode, GraphEdge } from '../../types/game'
import { MODE_COLORS, modeLegend } from '../../utils/transportModes'

const props = defineProps<{
  nodes: GraphNode[]
  edges: GraphEdge[]
  playerNode: number
  selectedNode: GraphNode | null
  reachableIds?: Set<number>
}>()

const emit = defineEmits<{ 'select-node': [node: GraphNode | null] }>()

const mapContainer = ref<HTMLDivElement>()
let map: maplibregl.Map | null = null

// ── Pie chart icon helpers ────────────────────────────────────────────────────

const MODE_ORDER = ['ESCOOTER', 'BUS', 'TRAIN', 'FERRY']
const ABBREV: Record<string, string> = { ESCOOTER: 'E', BUS: 'B', TRAIN: 'T', FERRY: 'F' }

function modesKey(modes: Set<string>): string {
  const key = MODE_ORDER.filter(m => modes.has(m)).map(m => ABBREV[m]).join('')
  return key || 'none'
}

function makePieIcon(modes: string[], isPlayer = false, isSelected = false): ImageData {
  const SIZE = 40
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  const cx = SIZE / 2
  const r  = SIZE / 2 - 2

  if (modes.length === 0) {
    ctx.beginPath()
    ctx.arc(cx, cx, r, 0, Math.PI * 2)
    ctx.fillStyle = isPlayer ? '#2563eb' : '#1f2937'
    ctx.fill()
  } else {
    const step = (Math.PI * 2) / modes.length
    let angle = -Math.PI / 2
    for (const mode of modes) {
      ctx.beginPath()
      ctx.moveTo(cx, cx)
      ctx.arc(cx, cx, r, angle, angle + step)
      ctx.closePath()
      ctx.fillStyle = MODE_COLORS[mode] ?? '#6b7280'
      ctx.fill()
      angle += step
    }
  }

  // Outer ring — blue for player, white for selected, dark otherwise
  ctx.beginPath()
  ctx.arc(cx, cx, r, 0, Math.PI * 2)
  ctx.strokeStyle = isPlayer ? '#60a5fa' : isSelected ? '#ffffff' : '#111827'
  ctx.lineWidth = isPlayer || isSelected ? 3 : 2
  ctx.stroke()

  return ctx.getImageData(0, 0, SIZE, SIZE)
}

function registerIcons() {
  if (!map) return
  // All 16 mode combinations × 3 states (normal / player / selected)
  for (let mask = 0; mask < 16; mask++) {
    const modes = MODE_ORDER.filter((_, i) => mask & (1 << i))
    const key   = modesKey(new Set(modes))
    map.addImage(`node-${key}`,          makePieIcon(modes))
    map.addImage(`node-${key}-player`,   makePieIcon(modes, true,  false))
    map.addImage(`node-${key}-selected`, makePieIcon(modes, false, true))
  }
}

// ── GeoJSON builders ──────────────────────────────────────────────────────────

function nodeModeMap(): Map<number, Set<string>> {
  const m = new Map<number, Set<string>>()
  for (const e of props.edges) {
    for (const mode of e.modes) {
      if (!m.has(e.from)) m.set(e.from, new Set())
      if (!m.has(e.to))   m.set(e.to,   new Set())
      m.get(e.from)!.add(mode)
      m.get(e.to)!.add(mode)
    }
  }
  return m
}

function nodeGeoJSON() {
  const modeMap = nodeModeMap()
  return {
    type: 'FeatureCollection' as const,
    features: props.nodes.map(n => {
      const modes = modeMap.get(n.id) ?? new Set<string>()
      const key   = modesKey(modes)
      const isPlayer   = n.id === props.playerNode
      const isSelected = n.id === props.selectedNode?.id
      const isReachable = !isPlayer && !!(props.reachableIds?.has(n.id) ??
        props.edges.some(
          e => (e.from === props.playerNode && e.to === n.id) ||
               (e.to   === props.playerNode && e.from === n.id)
        ))
      const iconKey = isPlayer ? `node-${key}-player`
                    : isSelected ? `node-${key}-selected`
                    : `node-${key}`
      return {
        type: 'Feature' as const,
        properties: { id: n.id, label: n.label, isReachable, isPlayer, iconKey },
        geometry: { type: 'Point' as const, coordinates: [n.lng, n.lat] },
      }
    }),
  }
}

function edgeGeoJSON() {
  const SPACING = 4.5
  return {
    type: 'FeatureCollection' as const,
    features: props.edges.flatMap(e => {
      const from = props.nodes.find(n => n.id === e.from)
      const to   = props.nodes.find(n => n.id === e.to)
      if (!from || !to) return []
      const modes = e.modes.length ? e.modes : ['BUS']
      const coords = e.coordinates ?? [[from.lng, from.lat], [to.lng, to.lat]]
      return modes.map((mode, i) => ({
        type: 'Feature' as const,
        properties: {
          mode,
          lineOffset: modes.length === 1 ? 0 : (i - (modes.length - 1) / 2) * SPACING,
        },
        geometry: { type: 'LineString' as const, coordinates: coords },
      }))
    }),
  }
}

function updateSources() {
  if (!map) return
  ;(map.getSource('nodes') as maplibregl.GeoJSONSource | undefined)?.setData(nodeGeoJSON() as any)
  ;(map.getSource('edges') as maplibregl.GeoJSONSource | undefined)?.setData(edgeGeoJSON() as any)
}

// ── Map setup ─────────────────────────────────────────────────────────────────

onMounted(() => {
  map = new maplibregl.Map({
    container: mapContainer.value!,
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json',
    center: [174.7762, -41.2865],
    zoom: 14,
    attributionControl: false,
  })

  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

  map.on('load', () => {
    if (!map) return

    registerIcons()

    map.addSource('edges', { type: 'geojson', data: edgeGeoJSON() as any })
    map.addSource('nodes', { type: 'geojson', data: nodeGeoJSON() as any })

    // Parallel coloured lines — one feature per mode per edge
    map.addLayer({
      id: 'edges',
      type: 'line',
      source: 'edges',
      paint: {
        'line-color': ['match', ['get', 'mode'],
          'ESCOOTER', MODE_COLORS.ESCOOTER,
          'BUS',      MODE_COLORS.BUS,
          'TRAIN',    MODE_COLORS.TRAIN,
          'FERRY',    MODE_COLORS.FERRY,
          '#6b7280',
        ],
        'line-width': 3,
        'line-offset': ['get', 'lineOffset'],
        'line-opacity': 0.85,
      },
    })

    // Reachable glow
    map.addLayer({
      id: 'nodes-reachable',
      type: 'circle',
      source: 'nodes',
      filter: ['==', ['get', 'isReachable'], true],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 14, 15, 18, 18, 26],
        'circle-color': 'rgba(255,255,255,0.06)',
        'circle-stroke-color': 'rgba(255,255,255,0.3)',
        'circle-stroke-width': 1.5,
      },
    })

    // Player position glow — large solid ring so the occupied node stands out
    map.addLayer({
      id: 'nodes-player-glow',
      type: 'circle',
      source: 'nodes',
      filter: ['==', ['get', 'isPlayer'], true],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 16, 15, 22, 18, 32],
        'circle-color': 'rgba(37,99,235,0.18)',
        'circle-stroke-color': '#3b82f6',
        'circle-stroke-width': 3,
      },
    })

    // Pie chart node icons — zoom-interpolated size; player node rendered larger
    map.addLayer({
      id: 'nodes',
      type: 'symbol',
      source: 'nodes',
      layout: {
        'icon-image': ['get', 'iconKey'],
        'icon-size': ['interpolate', ['linear'], ['zoom'],
          12, ['case', ['boolean', ['get', 'isPlayer'], false], 0.6,  0.4],
          15, ['case', ['boolean', ['get', 'isPlayer'], false], 0.85, 0.6],
          18, ['case', ['boolean', ['get', 'isPlayer'], false], 1.3,  1.0],
        ],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    })

    // Node ID labels
    map.addLayer({
      id: 'node-ids',
      type: 'symbol',
      source: 'nodes',
      layout: {
        'text-field': ['to-string', ['get', 'id']],
        'text-size': ['interpolate', ['linear'], ['zoom'], 12, 7, 15, 9, 18, 12],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-anchor': 'center',
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: { 'text-color': '#ffffff' },
    })

    // Node name labels (below)
    map.addLayer({
      id: 'node-labels',
      type: 'symbol',
      source: 'nodes',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 9,
        'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        'text-anchor': 'top',
        'text-offset': [0, 1.2],
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#9ca3af',
        'text-halo-color': '#111827',
        'text-halo-width': 1,
      },
    })

    map.on('click', 'nodes', e => {
      if (!e.features?.length) return
      const nodeId = e.features[0].properties.id as number
      emit('select-node', props.nodes.find(n => n.id === nodeId) ?? null)
    })

    map.on('click', e => {
      const hit = map!.queryRenderedFeatures(e.point, { layers: ['nodes'] })
      if (!hit.length) emit('select-node', null)
    })

    map.on('mouseenter', 'nodes', () => { map!.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'nodes', () => { map!.getCanvas().style.cursor = '' })
  })
})

onUnmounted(() => {
  map?.remove()
  map = null
})

watch(
  [() => props.nodes, () => props.edges, () => props.playerNode, () => props.selectedNode, () => props.reachableIds],
  updateSources,
  { deep: true },
)
</script>

<style scoped>
@reference "tailwindcss";

.map-panel {
  @apply flex-1 relative overflow-hidden;
}

.map-canvas {
  @apply w-full h-full;
}

.legend {
  @apply absolute bottom-8 left-3 flex gap-3 z-10;
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
