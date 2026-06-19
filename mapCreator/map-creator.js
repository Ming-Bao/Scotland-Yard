'use strict';

// ══════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════

const MODE_COLORS = {
  ESCOOTER: '#f59e0b',
  BUS:      '#ef4444',
  TRAIN:    '#f97316',
  FERRY:    '#06b6d4',
};

const MODE_ORDER = ['ESCOOTER', 'BUS', 'TRAIN', 'FERRY'];

function modesKey(modes) {
  const set = modes instanceof Set ? modes : new Set(modes);
  return MODE_ORDER.filter(m => set.has(m))
    .map(m => ({ ESCOOTER: 'E', BUS: 'B', TRAIN: 'T', FERRY: 'F' }[m]))
    .join('') || 'none';
}

function makePieIcon(modes) {
  const SIZE = 36;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const cx = SIZE / 2, r = SIZE / 2 - 2;

  if (modes.length === 0) {
    ctx.beginPath();
    ctx.arc(cx, cx, r, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    return ctx.getImageData(0, 0, SIZE, SIZE);
  }

  const step = (Math.PI * 2) / modes.length;
  let angle = -Math.PI / 2;
  for (const mode of modes) {
    ctx.beginPath();
    ctx.moveTo(cx, cx);
    ctx.arc(cx, cx, r, angle, angle + step);
    ctx.closePath();
    ctx.fillStyle = MODE_COLORS[mode] || '#6b7280';
    ctx.fill();
    angle += step;
  }

  ctx.beginPath();
  ctx.arc(cx, cx, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2;
  ctx.stroke();
  return ctx.getImageData(0, 0, SIZE, SIZE);
}

const CENTER       = [174.85, -41.21]; // Wellington / Lower Hutt midpoint
const CELL         = 0.002;            // spatial grid cell size in degrees (~200 m)
const SNAP_MAX_DEG = 0.008;            // max snap distance to a road (~800 m)

// ══════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════

let map      = null;
let roadData = null;
let segGrid  = new Map();  // cell key → [{a, b, aKey, bKey}]
let graphAdj = new Map();  // vertex key → [{key, dist}]

let nodes      = [];       // {id, lng, lat, label, segAKey, segBKey}
let edges      = [];       // {id, from, to, modes, coordinates}
let nextNodeId = 1;
let nextEdgeId = 1;

let activeModes    = new Set(['ESCOOTER', 'BUS']); // modes applied to new edges
let selectedEdgeId = null;

const drag = { active: false, nodeId: null, moved: false, justDragged: false };

// ══════════════════════════════════════════════════════════
//  GEOMETRY UTILS
// ══════════════════════════════════════════════════════════

function coordKey([lng, lat]) {
  return `${lng.toFixed(6)},${lat.toFixed(6)}`;
}

function coordFromKey(key) {
  return key.split(',').map(Number);
}

function nearestPtOnSeg([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return [ax, ay];
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return [ax + t * dx, ay + t * dy];
}

function distSqDeg([ax, ay], [bx, by]) {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

function haversine([lng1, lat1], [lng2, lat2]) {
  const R  = 6_371_000;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCoordLines(geometry) {
  if (geometry.type === 'LineString')      return [geometry.coordinates];
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  return [];
}

// ══════════════════════════════════════════════════════════
//  SPATIAL INDEX + ROUTING GRAPH
// ══════════════════════════════════════════════════════════

function buildIndex(geojson) {
  segGrid  = new Map();
  graphAdj = new Map();

  for (const feature of geojson.features) {
    for (const coords of getCoordLines(feature.geometry)) {
      for (let i = 0; i < coords.length - 1; i++) {
        const a = coords[i], b = coords[i + 1];
        const aKey = coordKey(a), bKey = coordKey(b);
        if (aKey === bKey) continue;

        // Routing graph
        if (!graphAdj.has(aKey)) graphAdj.set(aKey, []);
        if (!graphAdj.has(bKey)) graphAdj.set(bKey, []);
        const d = haversine(a, b);
        if (!graphAdj.get(aKey).some(e => e.key === bKey)) {
          graphAdj.get(aKey).push({ key: bKey, dist: d });
          graphAdj.get(bKey).push({ key: aKey, dist: d });
        }

        // Spatial index: segment bbox → cells
        const seg = { a, b, aKey, bKey };
        const x0 = Math.floor(Math.min(a[0], b[0]) / CELL);
        const x1 = Math.floor(Math.max(a[0], b[0]) / CELL);
        const y0 = Math.floor(Math.min(a[1], b[1]) / CELL);
        const y1 = Math.floor(Math.max(a[1], b[1]) / CELL);
        for (let cx = x0; cx <= x1; cx++) {
          for (let cy = y0; cy <= y1; cy++) {
            const k = `${cx},${cy}`;
            if (!segGrid.has(k)) segGrid.set(k, []);
            segGrid.get(k).push(seg);
          }
        }
      }
    }
  }
}

// ══════════════════════════════════════════════════════════
//  ROAD SNAPPING
// ══════════════════════════════════════════════════════════

function snapToRoad(lng, lat) {
  const cx = Math.floor(lng / CELL);
  const cy = Math.floor(lat / CELL);

  let nearest   = null;
  let nearestDSq = SNAP_MAX_DEG ** 2;

  for (let r = 0; r <= 3; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (r > 0 && Math.abs(dx) < r && Math.abs(dy) < r) continue;
        for (const { a, b, aKey, bKey } of (segGrid.get(`${cx + dx},${cy + dy}`) || [])) {
          const pt = nearestPtOnSeg([lng, lat], a, b);
          const d  = distSqDeg(pt, [lng, lat]);
          if (d < nearestDSq) {
            nearestDSq = d;
            nearest = { lng: pt[0], lat: pt[1], segAKey: aKey, segBKey: bKey };
          }
        }
      }
    }
    if (nearest) break;
  }

  return nearest;
}

// ══════════════════════════════════════════════════════════
//  DIJKSTRA ROAD ROUTING
// ══════════════════════════════════════════════════════════

function heapPush(h, item) {
  h.push(item);
  let i = h.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (h[p][0] <= h[i][0]) break;
    [h[p], h[i]] = [h[i], h[p]];
    i = p;
  }
}

function heapPop(h) {
  const top  = h[0];
  const last = h.pop();
  if (h.length > 0) {
    h[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = 2 * i + 2;
      let s = i;
      if (l < h.length && h[l][0] < h[s][0]) s = l;
      if (r < h.length && h[r][0] < h[s][0]) s = r;
      if (s === i) break;
      [h[i], h[s]] = [h[s], h[i]];
      i = s;
    }
  }
  return top;
}

function findRoadPath(fromNode, toNode, maxDist = Infinity) {
  const dist = new Map();
  const prev = new Map();
  const heap = [];

  function init(key, snapPt) {
    const d = haversine(snapPt, coordFromKey(key));
    if (d < (dist.get(key) ?? Infinity)) {
      dist.set(key, d);
      prev.set(key, '__src__');
      heapPush(heap, [d, key]);
    }
  }

  const srcPt = [fromNode.lng, fromNode.lat];
  init(fromNode.segAKey, srcPt);
  if (fromNode.segBKey !== fromNode.segAKey) init(fromNode.segBKey, srcPt);

  while (heap.length > 0) {
    const [d, u] = heapPop(heap);
    if (d > maxDist) break;
    if (d > (dist.get(u) ?? Infinity)) continue;
    for (const { key: v, dist: w } of (graphAdj.get(u) || [])) {
      const nd = d + w;
      if (nd < (dist.get(v) ?? Infinity)) {
        dist.set(v, nd);
        prev.set(v, u);
        heapPush(heap, [nd, v]);
      }
    }
  }

  const tgtPt = [toNode.lng, toNode.lat];
  const costA  = (dist.get(toNode.segAKey) ?? Infinity) + haversine(coordFromKey(toNode.segAKey), tgtPt);
  const costB  = (dist.get(toNode.segBKey) ?? Infinity) + haversine(coordFromKey(toNode.segBKey), tgtPt);

  if (costA === Infinity && costB === Infinity) return [srcPt, tgtPt];

  const endKey = costA <= costB ? toNode.segAKey : toNode.segBKey;
  const verts  = [];
  let cur = endKey;
  while (cur && cur !== '__src__') {
    verts.unshift(coordFromKey(cur));
    cur = prev.get(cur);
  }

  return [srcPt, ...verts, tgtPt];
}

// ══════════════════════════════════════════════════════════
//  NODE / EDGE MANAGEMENT
// ══════════════════════════════════════════════════════════

function addNode(snap) {
  const id   = nextNodeId++;
  const node = { id, lng: snap.lng, lat: snap.lat, label: String(id), segAKey: snap.segAKey, segBKey: snap.segBKey };
  nodes.push(node);
  refreshSources();
  updateCounts();
  return node;
}

function renameNode(id) {
  const node = nodes.find(n => n.id === id);
  if (!node) return;
  const newLabel = prompt(`Rename node ${id}:`, node.label);
  if (newLabel !== null) {
    node.label = newLabel.trim() || node.label;
    refreshSources();
  }
}

function removeNode(id) {
  nodes = nodes.filter(n => n.id !== id);
  edges = edges.filter(e => e.from !== id && e.to !== id);
  refreshSources();
  updateCounts();
}

function addEdge(fromId, toId) {
  const from = nodes.find(n => n.id === fromId);
  const to   = nodes.find(n => n.id === toId);
  if (!from || !to || fromId === toId) return;

  if (edges.some(e =>
    (e.from === fromId && e.to === toId) ||
    (e.from === toId   && e.to === fromId)
  )) {
    setStatus('Edge already exists between these nodes');
    return;
  }

  setStatus('Routing…');
  const coordinates = (roadData && from.segAKey && to.segAKey)
    ? findRoadPath(from, to)
    : [[from.lng, from.lat], [to.lng, to.lat]];

  edges.push({ id: nextEdgeId++, from: fromId, to: toId, modes: [...activeModes], coordinates });
  refreshSources();
  updateCounts();
  setStatus('Ready');
}

function removeEdge(id) {
  edges = edges.filter(e => e.id !== id);
  refreshSources();
  updateCounts();
}

// ══════════════════════════════════════════════════════════
//  GEOJSON BUILDERS
// ══════════════════════════════════════════════════════════

function nodesGJ() {
  const nodeModes = new Map();
  for (const e of edges) {
    for (const m of e.modes) {
      if (!nodeModes.has(e.from)) nodeModes.set(e.from, new Set());
      if (!nodeModes.has(e.to))   nodeModes.set(e.to,   new Set());
      nodeModes.get(e.from).add(m);
      nodeModes.get(e.to).add(m);
    }
  }
  return {
    type: 'FeatureCollection',
    features: nodes.map(n => {
      const ms = nodeModes.get(n.id) ?? new Set();
      return {
        type: 'Feature',
        properties: {
          id: n.id, label: n.label,
          modesKey:    modesKey(ms),
          hasEscooter: ms.has('ESCOOTER'),
          hasBus:      ms.has('BUS'),
          hasTrain:    ms.has('TRAIN'),
          hasFerry:    ms.has('FERRY'),
        },
        geometry: { type: 'Point', coordinates: [n.lng, n.lat] },
      };
    }),
  };
}

function edgesGJ() {
  const SPACING = 4.5;
  const features = [];
  for (const e of edges) {
    const modes = e.modes.length ? e.modes : ['BUS'];
    const n = modes.length;
    modes.forEach((mode, i) => {
      features.push({
        type: 'Feature',
        properties: { id: e.id, mode, lineOffset: n === 1 ? 0 : (i - (n - 1) / 2) * SPACING },
        geometry: { type: 'LineString', coordinates: e.coordinates },
      });
    });
  }
  return { type: 'FeatureCollection', features };
}

function previewGJ(coords) {
  return {
    type: 'FeatureCollection',
    features: coords
      ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }]
      : [],
  };
}

// ══════════════════════════════════════════════════════════
//  MAP INITIALISATION
// ══════════════════════════════════════════════════════════

function initMap() {
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json',
    center: CENTER,
    zoom: 12,
    attributionControl: false,
  });

  map.addControl(new maplibregl.NavigationControl(), 'top-right');
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

  map.on('load', () => {
    map.addSource('roads-display',  { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource('edges',          { type: 'geojson', data: edgesGJ() });
    map.addSource('selected-edge',  { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource('preview',        { type: 'geojson', data: previewGJ(null) });
    map.addSource('nodes',          { type: 'geojson', data: nodesGJ() });

    // Pre-generate pie chart icons for all 16 mode combinations
    for (let mask = 0; mask < 16; mask++) {
      const modes = MODE_ORDER.filter((_, i) => mask & (1 << i));
      map.addImage(`node-pie-${modesKey(new Set(modes))}`, makePieIcon(modes));
    }

    map.addLayer({
      id: 'roads-display', type: 'line', source: 'roads-display',
      paint: { 'line-color': '#94a3b8', 'line-width': 1.5, 'line-opacity': 0.5 },
    });

    // Selected edge halo — drawn below game edges
    map.addLayer({
      id: 'selected-edge', type: 'line', source: 'selected-edge',
      paint: { 'line-color': '#ffffff', 'line-width': 11, 'line-opacity': 0.35 },
    });

    map.addLayer({
      id: 'edges', type: 'line', source: 'edges',
      paint: {
        'line-color': ['match', ['get', 'mode'],
          'ESCOOTER', MODE_COLORS.ESCOOTER,
          'BUS',      MODE_COLORS.BUS,
          'TRAIN',    MODE_COLORS.TRAIN,
          'FERRY',    MODE_COLORS.FERRY,
          '#94a3b8',
        ],
        'line-width': 4,
        'line-offset': ['get', 'lineOffset'],
        'line-opacity': 1,
      },
    });

    map.addLayer({
      id: 'preview', type: 'line', source: 'preview',
      paint: { 'line-color': '#fff', 'line-width': 2, 'line-dasharray': [4, 3], 'line-opacity': 0.55 },
    });

    map.addLayer({
      id: 'nodes', type: 'symbol', source: 'nodes',
      layout: {
        'icon-image': ['concat', 'node-pie-', ['get', 'modesKey']],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.44, 15, 0.67, 18, 1.0],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    });

    map.addLayer({
      id: 'node-labels', type: 'symbol', source: 'nodes',
      layout: {
        'text-field': ['to-string', ['get', 'id']],
        'text-size': ['interpolate', ['linear'], ['zoom'], 12, 9, 18, 13],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-anchor': 'center',
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: { 'text-color': '#ffffff' },
    });

    map.addLayer({
      id: 'node-name-labels', type: 'symbol', source: 'nodes',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 10,
        'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        'text-anchor': 'top',
        'text-offset': [0, 1.2],
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#d1d5db',
        'text-halo-color': '#000000',
        'text-halo-width': 1.5,
      },
    });

    setupInteractions();
    autoLoadRoads();
  });
}

// ══════════════════════════════════════════════════════════
//  MAP SOURCE REFRESH
// ══════════════════════════════════════════════════════════

function refreshSources() {
  if (!map) return;
  map.getSource('nodes')?.setData(nodesGJ());
  map.getSource('edges')?.setData(edgesGJ());
  map.triggerRepaint();
}

function setPreview(coords) {
  map?.getSource('preview')?.setData(previewGJ(coords));
}

// ══════════════════════════════════════════════════════════
//  INTERACTIONS
// ══════════════════════════════════════════════════════════

function setupInteractions() {
  map.on('mouseenter', 'nodes', () => { map.getCanvas().style.cursor = 'grab'; });
  map.on('mouseleave', 'nodes', () => { map.getCanvas().style.cursor = ''; });
  map.on('mouseenter', 'edges', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'edges', () => { map.getCanvas().style.cursor = ''; });

  map.on('mousedown', e => {
    if (e.originalEvent.button !== 0) return; // left-click only
    const hit = map.queryRenderedFeatures(e.point, { layers: ['nodes'] });
    if (hit.length === 0) return;
    drag.active = true;
    drag.nodeId = hit[0].properties.id;
    drag.moved  = false;
    map.dragPan.disable();
    e.preventDefault();
  });

  map.on('mousemove', e => {
    if (!drag.active) return;
    const from = nodes.find(n => n.id === drag.nodeId);
    if (!from) return;
    drag.moved = true;
    setPreview([[from.lng, from.lat], [e.lngLat.lng, e.lngLat.lat]]);
  });

  map.on('mouseup', e => {
    if (!drag.active) return;
    setPreview(null);
    map.dragPan.enable();

    if (drag.moved) {
      const hit = map.queryRenderedFeatures(e.point, { layers: ['nodes'] });
      if (hit.length > 0 && hit[0].properties.id !== drag.nodeId) {
        addEdge(drag.nodeId, hit[0].properties.id);
      }
    }

    drag.active      = false;
    drag.nodeId      = null;
    if (drag.moved) drag.justDragged = true;
    drag.moved       = false;
  });

  map.getCanvas().addEventListener('mouseleave', () => {
    if (!drag.active) return;
    setPreview(null);
    map.dragPan.enable();
    drag.active      = false;
    drag.nodeId      = null;
    drag.moved       = false;
    drag.justDragged = false;
  });

  map.on('click', e => {
    if (drag.justDragged) { drag.justDragged = false; return; }

    const nodeHit = map.queryRenderedFeatures(e.point, { layers: ['nodes'] });
    if (nodeHit.length > 0) {
      selectEdge(null);
      renameNode(nodeHit[0].properties.id);
      return;
    }

    selectEdge(null);

    const snap = snapToRoad(e.lngLat.lng, e.lngLat.lat);
    if (!snap) { setStatus('No road found nearby — zoom in and click closer to a road'); return; }

    addNode(snap);
    setStatus(`Node ${nextNodeId - 1} added`);
  });

  map.on('contextmenu', e => {
    e.preventDefault?.();
    const nodeHit = map.queryRenderedFeatures(e.point, { layers: ['nodes'] });
    const edgeHit = map.queryRenderedFeatures(e.point, { layers: ['edges'] });

    if (nodeHit.length > 0) {
      selectEdge(null);
      removeNode(nodeHit[0].properties.id);
    } else if (edgeHit.length > 0) {
      selectEdge(edgeHit[0].properties.id);
    }
  });
}


// ══════════════════════════════════════════════════════════
//  EDGE SELECTION + MODE EDITOR
// ══════════════════════════════════════════════════════════

function selectEdge(id) {
  selectedEdgeId = id;
  const panel = document.getElementById('edge-panel');

  if (id === null) {
    panel.style.display = 'none';
    map.getSource('selected-edge')?.setData({ type: 'FeatureCollection', features: [] });
    return;
  }

  const edge = edges.find(e => e.id === id);
  if (!edge) { selectEdge(null); return; }

  // Highlight selected edge
  map.getSource('selected-edge')?.setData({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: edge.coordinates } }],
  });

  // Update panel
  const fromNode = nodes.find(n => n.id === edge.from);
  const toNode   = nodes.find(n => n.id === edge.to);
  document.getElementById('ep-label').textContent =
    `${fromNode?.label ?? edge.from} → ${toNode?.label ?? edge.to}`;
  document.querySelectorAll('.ep-mode-btn').forEach(btn =>
    btn.classList.toggle('active', edge.modes.includes(btn.dataset.mode))
  );
  panel.style.display = 'flex';
  map.triggerRepaint();
}

// Edge panel buttons
document.querySelectorAll('.ep-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (selectedEdgeId === null) return;
    const edge = edges.find(e => e.id === selectedEdgeId);
    if (!edge) return;
    const m = btn.dataset.mode;
    if (edge.modes.includes(m)) {
      if (edge.modes.length > 1) edge.modes = edge.modes.filter(x => x !== m);
    } else {
      edge.modes.push(m);
    }
    btn.classList.toggle('active', edge.modes.includes(m));
    refreshSources();
  });
});

document.getElementById('ep-delete').addEventListener('click', () => {
  if (selectedEdgeId !== null) { removeEdge(selectedEdgeId); selectEdge(null); }
});
document.getElementById('ep-close').addEventListener('click', () => selectEdge(null));

// ══════════════════════════════════════════════════════════
//  SAVE / LOAD
// ══════════════════════════════════════════════════════════

function saveMap() {
  const output = {
    nodes: nodes.map(n => ({ id: n.id, lat: n.lat, lng: n.lng, label: n.label })),
    edges: edges.map(e => ({ from: e.from, to: e.to, modes: e.modes, coordinates: e.coordinates })),
  };

  const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: 'scotland-yard-map.json' }).click();
  URL.revokeObjectURL(url);
  setStatus(`Saved — ${nodes.length} nodes, ${edges.length} edges`);
}

function loadMapFile(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      nodes = []; edges = []; nextNodeId = 1; nextEdgeId = 1;

      for (const n of data.nodes ?? []) {
        nodes.push({ id: n.id, lng: n.lng, lat: n.lat, label: n.label ?? `Node ${n.id}`, segAKey: null, segBKey: null });
        nextNodeId = Math.max(nextNodeId, n.id + 1);
      }
      for (const e of data.edges ?? []) {
        edges.push({ id: nextEdgeId++, from: e.from, to: e.to, modes: e.modes, coordinates: e.coordinates ?? [] });
      }

      refreshSources();
      updateCounts();
      document.getElementById('btn-save-map').disabled = false;
      setStatus(`Loaded — ${nodes.length} nodes, ${edges.length} edges`);

      if (nodes.length > 0) {
        const lngs = nodes.map(n => n.lng), lats = nodes.map(n => n.lat);
        map.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 80, maxZoom: 15 }
        );
      }
    } catch (err) {
      setStatus('Error loading map: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function autoLoadRoads() {
  setStatus('Loading road data…');
  roadData = WELLINGTON_GEOJSON;
  map.getSource('roads-display')?.setData(roadData);

  const allCoords = [];
  for (const f of roadData.features) {
    for (const line of getCoordLines(f.geometry)) allCoords.push(...line);
  }
  if (allCoords.length > 0) {
    const lngs = allCoords.map(c => c[0]), lats = allCoords.map(c => c[1]);
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 40 }
    );
  }

  setStatus('Building road graph…');
  setTimeout(() => {
    buildIndex(roadData);
    document.getElementById('btn-save-map').disabled = false;
    document.getElementById('btn-auto-gen').disabled = false;
    setStatus(`Ready — ${graphAdj.size.toLocaleString()} road vertices. Click a road to place a node.`);
  }, 30);
}

// ══════════════════════════════════════════════════════════
//  AUTO-GENERATE
// ══════════════════════════════════════════════════════════

async function autoGenerate() {
  if (!graphAdj.size) { setStatus('Road graph not ready yet'); return; }
  if ((nodes.length || edges.length) && !confirm('Clear all existing nodes and edges and auto-generate?')) return;

  const btn = document.getElementById('btn-auto-gen');
  btn.disabled = true;

  // ── 1. Collect road vertices and shuffle ──────────────────
  const candidates = [];
  for (const key of graphAdj.keys()) {
    const [lng, lat] = coordFromKey(key);
    candidates.push({ lng, lat, key });
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // ── 2. Minimum-distance sampling (~300 m apart) ───────────
  const MIN_DIST = 0.003;
  const TARGET   = 160;
  const selected = [];
  for (const c of candidates) {
    if (selected.length >= TARGET) break;
    if (!selected.some(s => Math.hypot(c.lng - s.lng, c.lat - s.lat) < MIN_DIST))
      selected.push(c);
  }

  // ── 3. Place nodes ────────────────────────────────────────
  nodes = []; edges = []; nextNodeId = 1; nextEdgeId = 1;
  for (const c of selected) {
    nodes.push({ id: nextNodeId++, lng: c.lng, lat: c.lat,
                 label: String(nextNodeId - 1), segAKey: c.key, segBKey: c.key });
  }
  updateCounts();
  refreshSources();
  setStatus(`Placed ${nodes.length} nodes — routing edges…`);
  await new Promise(r => setTimeout(r, 0));

  // ── 4. All pairs sorted by distance ──────────────────────
  const MAX_DEGREE   = 4;
  const MAX_FILL_DEG = 0.012; // ~1.2 km cap for phase 2

  const allPairs = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(nodes[i].lng - nodes[j].lng, nodes[i].lat - nodes[j].lat);
      allPairs.push({ i, j, d });
    }
  }
  allPairs.sort((a, b) => a.d - b.d);

  // ── 5. Edge builder — returns false if no road path found ─
  const degree = new Array(nodes.length).fill(0);
  const added  = new Set(); // "i-j" (i < j)

  function commitEdge(i, j, preCoords) {
    const key = `${i}-${j}`;
    if (added.has(key)) return true;
    const ni = nodes[i], nj = nodes[j];
    let coords = preCoords;
    if (!coords) {
      const dm = haversine([ni.lng, ni.lat], [nj.lng, nj.lat]);
      coords = findRoadPath(ni, nj, Math.min(dm * 5, 8000));
      if (coords.length === 2) return false; // straight-line fallback — skip
    }
    edges.push({ id: nextEdgeId++, from: ni.id, to: nj.id, modes: ['ESCOOTER'], coordinates: coords });
    degree[i]++;
    degree[j]++;
    added.add(key);
    return true;
  }

  // ── 6. Phase 1: Kruskal's spanning tree (road-only edges) ─
  const parent = Array.from({ length: nodes.length }, (_, i) => i);
  function find(x) {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  }
  function unionNodes(x, y) {
    const rx = find(x), ry = find(y);
    if (rx === ry) return false;
    parent[rx] = ry;
    return true;
  }

  let remaining = nodes.length, done = 0;
  for (const { i, j } of allPairs) {
    if (remaining <= 1) break;
    if (find(i) === find(j)) continue; // already same component
    const ni = nodes[i], nj = nodes[j];
    const dm = haversine([ni.lng, ni.lat], [nj.lng, nj.lat]);
    const coords = findRoadPath(ni, nj, Math.min(dm * 5, 8000));
    if (coords.length === 2) continue; // no road path — try next pair
    unionNodes(i, j);
    commitEdge(i, j, coords);
    remaining--;
    if (++done % 10 === 0) {
      updateCounts(); refreshSources();
      setStatus(`Spanning tree… ${edges.length} edges`);
      await new Promise(r => setTimeout(r, 0));
    }
  }

  // ── 7. Phase 2: fill to MAX_DEGREE with short-range edges ─
  done = 0;
  for (const { i, j, d } of allPairs) {
    if (d >= MAX_FILL_DEG) break; // sorted, so first long pair ends this
    if (degree[i] >= MAX_DEGREE || degree[j] >= MAX_DEGREE) continue;
    commitEdge(i, j); // no-op if already in spanning tree
    if (++done % 20 === 0) {
      updateCounts(); refreshSources();
      setStatus(`Filling connections… ${edges.length} edges`);
      await new Promise(r => setTimeout(r, 0));
    }
  }

  refreshSources();
  updateCounts();
  document.getElementById('btn-save-map').disabled = false;
  btn.disabled = false;
  setStatus(`Generated ${nodes.length} nodes, ${edges.length} edges`);
}

// ══════════════════════════════════════════════════════════
//  UI HELPERS
// ══════════════════════════════════════════════════════════

function setStatus(msg) {
  document.getElementById('status').textContent = msg;
}

function updateCounts() {
  document.getElementById('node-count').textContent = nodes.length;
  document.getElementById('edge-count').textContent = edges.length;
}

// ══════════════════════════════════════════════════════════
//  TOOLBAR WIRING
// ══════════════════════════════════════════════════════════

document.getElementById('btn-load-map').addEventListener('click', () => document.getElementById('file-map').click());
document.getElementById('btn-save-map').addEventListener('click', saveMap);
document.getElementById('btn-auto-gen').addEventListener('click', autoGenerate);

document.getElementById('file-map').addEventListener('change', e => {
  if (e.target.files[0]) loadMapFile(e.target.files[0]);
  e.target.value = '';
});

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const m = btn.dataset.mode;
    if (activeModes.has(m)) {
      if (activeModes.size > 1) activeModes.delete(m);
    } else {
      activeModes.add(m);
    }
    document.querySelectorAll('.mode-btn').forEach(b =>
      b.classList.toggle('active', activeModes.has(b.dataset.mode))
    );
  });
});

// ══════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════

initMap();
