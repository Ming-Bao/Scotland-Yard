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
}>()

const emit = defineEmits<{ 'select-node': [node: GraphNode | null] }>()

const mapContainer = ref<HTMLDivElement>()
let map: maplibregl.Map | null = null

function isReachable(nodeId: number): boolean {
  if (nodeId === props.playerNode) return false
  return props.edges.some(
    e => (e.from === props.playerNode && e.to === nodeId) ||
         (e.to   === props.playerNode && e.from === nodeId)
  )
}

function nodeGeoJSON() {
  return {
    type: 'FeatureCollection' as const,
    features: props.nodes.map(n => ({
      type: 'Feature' as const,
      properties: {
        id: n.id,
        label: n.label,
        isPlayer:   n.id === props.playerNode,
        isSelected: n.id === props.selectedNode?.id,
        isReachable: isReachable(n.id),
      },
      geometry: { type: 'Point' as const, coordinates: [n.lng, n.lat] },
    })),
  }
}

function edgeGeoJSON() {
  return {
    type: 'FeatureCollection' as const,
    features: props.edges.flatMap(e => {
      const from = props.nodes.find(n => n.id === e.from)
      const to   = props.nodes.find(n => n.id === e.to)
      if (!from || !to) return []
      return [{
        type: 'Feature' as const,
        properties: { primaryMode: e.modes[0] },
        geometry: {
          type: 'LineString' as const,
          coordinates: [[from.lng, from.lat], [to.lng, to.lat]],
        },
      }]
    }),
  }
}

function updateSources() {
  if (!map) return
  ;(map.getSource('nodes') as maplibregl.GeoJSONSource | undefined)?.setData(nodeGeoJSON() as any)
  ;(map.getSource('edges') as maplibregl.GeoJSONSource | undefined)?.setData(edgeGeoJSON() as any)
}

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

    map.addSource('edges', { type: 'geojson', data: edgeGeoJSON() as any })
    map.addSource('nodes', { type: 'geojson', data: nodeGeoJSON() as any })

    // Edges coloured by primary transport mode
    map.addLayer({
      id: 'edges',
      type: 'line',
      source: 'edges',
      paint: {
        'line-color': ['match', ['get', 'primaryMode'],
          'ESCOOTER', MODE_COLORS.ESCOOTER,
          'BUS',      MODE_COLORS.BUS,
          'TRAIN',    MODE_COLORS.TRAIN,
          'FERRY',    MODE_COLORS.FERRY,
          '#6b7280',
        ],
        'line-width': 3,
        'line-opacity': 0.6,
      },
    })

    // Reachable node glow
    map.addLayer({
      id: 'nodes-reachable',
      type: 'circle',
      source: 'nodes',
      filter: ['==', ['get', 'isReachable'], true],
      paint: {
        'circle-radius': 20,
        'circle-color': 'rgba(255,255,255,0.06)',
        'circle-stroke-color': 'rgba(255,255,255,0.25)',
        'circle-stroke-width': 1.5,
      },
    })

    // Node base circles
    map.addLayer({
      id: 'nodes',
      type: 'circle',
      source: 'nodes',
      paint: {
        'circle-radius': 14,
        'circle-color': ['case',
          ['get', 'isPlayer'],   '#2563eb',
          ['get', 'isSelected'], '#374151',
          '#1f2937',
        ],
        'circle-stroke-color': ['case',
          ['get', 'isSelected'], '#ffffff',
          '#4b5563',
        ],
        'circle-stroke-width': ['case',
          ['get', 'isSelected'], 2,
          1.5,
        ],
      },
    })

    // Node ID numbers (inside circles)
    map.addLayer({
      id: 'node-ids',
      type: 'symbol',
      source: 'nodes',
      layout: {
        'text-field': ['to-string', ['get', 'id']],
        'text-size': 11,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-anchor': 'center',
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: { 'text-color': '#ffffff' },
    })

    // Node name labels (below circles)
    map.addLayer({
      id: 'node-labels',
      type: 'symbol',
      source: 'nodes',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 9,
        'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        'text-anchor': 'top',
        'text-offset': [0, 1.5],
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#9ca3af',
        'text-halo-color': '#111827',
        'text-halo-width': 1,
      },
    })

    // Node click → select
    map.on('click', 'nodes', e => {
      if (!e.features?.length) return
      const nodeId = e.features[0].properties.id as number
      emit('select-node', props.nodes.find(n => n.id === nodeId) ?? null)
    })

    // Map click outside nodes → deselect
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
  [() => props.nodes, () => props.edges, () => props.playerNode, () => props.selectedNode],
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
