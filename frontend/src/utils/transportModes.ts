export const MODE_COLORS: Record<string, string> = {
  ESCOOTER: '#f59e0b',
  BUS:      '#ef4444',
  TRAIN:    '#f97316',
  FERRY:    '#06b6d4',
  BLACK:    '#a855f7',
}

const MODE_LABELS: Record<string, string> = {
  ESCOOTER: 'Escooter',
  BUS:      'Bus',
  TRAIN:    'Train',
  FERRY:    'Ferry',
  BLACK:    'Black',
}

export function modeColor(mode: string): string {
  return MODE_COLORS[mode] ?? '#6b7280'
}

export function modeLabel(mode: string): string {
  return MODE_LABELS[mode] ?? mode
}

export const modeLegend = [
  { mode: 'ESCOOTER', label: 'Escooter', color: MODE_COLORS.ESCOOTER },
  { mode: 'BUS',      label: 'Bus',      color: MODE_COLORS.BUS },
  { mode: 'TRAIN',    label: 'Train',    color: MODE_COLORS.TRAIN },
  { mode: 'FERRY',    label: 'Ferry',    color: MODE_COLORS.FERRY },
]
