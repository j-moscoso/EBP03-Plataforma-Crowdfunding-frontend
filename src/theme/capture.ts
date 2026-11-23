import type { Theme } from './theme'

export interface Snapshot {
  theme: Theme
  canvas: HTMLCanvasElement
  scale: number
  key: string
  ms: number
}

const BACKGROUND: Record<Theme, string> = {
  light: '#f0fdf8',
  dark: '#07120e',
}

const isCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches

function legacyColor(value: string): string {
  const match = value.match(
    /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/,
  )
  if (!match) return value
  const channels = match.slice(1, 4).map(channel =>
    Math.round(Math.max(0, Math.min(1, Number(channel))) * 255),
  )
  const alpha = match[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(match[4])))
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`
}

function makeCaptureStylesCompatible(documentClone: Document): void {
  const view = documentClone.defaultView
  if (!view) return
  const colorProperties = [
    'color',
    'background-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'text-decoration-color',
    'fill',
    'stroke',
  ]
  documentClone.querySelectorAll<HTMLElement>('*').forEach(element => {
    const computed = view.getComputedStyle(element)
    colorProperties.forEach(property => {
      const value = computed.getPropertyValue(property)
      if (value) element.style.setProperty(property, legacyColor(value))
    })
  })
}

export function renderScale(): number {
  const cap = isCoarsePointer() ? 1.25 : 1.75
  return Math.min(window.devicePixelRatio || 1, cap)
}

function documentSize() {
  const element = document.documentElement
  return {
    width: element.clientWidth,
    height: Math.max(element.scrollHeight, element.clientHeight),
  }
}

export function layoutKey(scale: number): string {
  const { width, height } = documentSize()
  return `${window.location.pathname}${window.location.search}|${width}x${height}@${scale}`
}

export async function capturePage(
  theme: Theme,
  scale: number,
  maxTextureSize: number,
): Promise<Snapshot> {
  const startedAt = performance.now()
  const key = layoutKey(scale)
  const { width, height } = documentSize()
  const safeScale = Math.min(scale, maxTextureSize / width, maxTextureSize / height)
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(document.body, {
    scale: safeScale,
    backgroundColor: BACKGROUND[theme],
    x: 0,
    y: 0,
    width,
    height,
    scrollX: 0,
    scrollY: 0,
    windowWidth: width,
    windowHeight: document.documentElement.clientHeight,
    logging: false,
    useCORS: true,
    onclone: documentClone => {
      documentClone.documentElement.dataset.theme = theme
      documentClone.querySelectorAll<HTMLElement>('[data-ink-live]').forEach(element => {
        element.style.visibility = 'hidden'
      })
      makeCaptureStylesCompatible(documentClone)
    },
  })
  return {
    theme,
    canvas,
    scale: safeScale,
    key,
    ms: performance.now() - startedAt,
  }
}
