import gsap from 'gsap'
import { capturePage, layoutKey, renderScale } from './capture'
import { inkParams } from './gl/params'
import { InkRenderer, type InkFrame, type InkSource } from './gl/renderer'
import { applyTheme, getTheme, otherTheme, type Theme } from './theme'

export interface InkPoint {
  x: number
  y: number
}

interface InkTransitionOptions {
  onThemeChange?: (theme: Theme) => void
  webgl?: boolean
}

type ActiveFrame = Omit<InkFrame, 'progress' | 'radius' | 'time' | 'cleanup'>

const EASE = 'power3.out'
const FADE_OUT_SECONDS = 0.15
const CSS_FADE_SECONDS = 0.45
const RESIZE_DEBOUNCE_MS = 250
const SPREAD = {
  growth: 0.7,
  cleanupFrom: 0.45,
  cleanupReach: 0.4,
  cleanupPower: 2,
}

export class InkTransition {
  private readonly renderer: InkRenderer | null
  private readonly onThemeChange?: (theme: Theme) => void
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  private readonly state = { progress: 0, time: 0 }
  private readonly resizeObserver: ResizeObserver | null
  private tween: gsap.core.Tween | null = null
  private fade: gsap.core.Tween | null = null
  private frame: ActiveFrame | null = null
  private captureGeneration = 0
  private capturing = false
  private captureQueued = false
  private resizeTimer = 0
  private cssFadeTimer = 0
  private destroyed = false

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: InkTransitionOptions = {},
  ) {
    this.onThemeChange = options.onThemeChange
    this.renderer = options.webgl === false ? null : InkRenderer.create(canvas)
    document.documentElement.dataset.ink = this.renderer ? 'webgl' : 'css'

    if (!this.renderer) {
      this.resizeObserver = null
      return
    }

    this.renderer.resize(renderScale())
    this.renderer.watchContext(
      () => this.cancel(),
      () => this.scheduleCapture(0),
    )
    window.addEventListener('resize', this.handleResize)
    window.addEventListener('impulsafund:route-ready', this.handleRouteChange)
    this.reducedMotion.addEventListener('change', this.handleMotionChange)
    this.resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => this.scheduleCapture(RESIZE_DEBOUNCE_MS))
    this.resizeObserver?.observe(document.body)
    void document.fonts.ready.then(() => this.scheduleCapture(0))
  }

  toggle(point?: InkPoint): void {
    const to = otherTheme(getTheme())
    const renderer = this.renderer
    const scale = renderScale()
    const key = layoutKey(scale)
    const interrupting = this.frame !== null
    const canAnimate =
      renderer !== null &&
      !renderer.isLost &&
      !this.reducedMotion.matches &&
      renderer.hasValid(to, key) &&
      (interrupting || renderer.hasValid(getTheme(), key))

    if (!canAnimate || !renderer) {
      this.cancel()
      this.crossFade(to)
      if (renderer && !this.reducedMotion.matches) this.scheduleCapture(0)
      return
    }

    let from: InkSource = getTheme()
    if (interrupting) {
      this.tween?.kill()
      this.fade?.kill()
      const frozen = this.currentFrame()
      from = frozen && renderer.freeze(frozen) ? 'composite' : getTheme()
    }

    const center = point ?? {
      x: document.documentElement.clientWidth / 2,
      y: document.documentElement.clientHeight / 2,
    }
    const maxDistance = farthestCorner(center)
    this.frame = {
      from,
      to,
      center,
      maxDist: maxDistance,
      seed: {
        x: Math.random() * 64 - 32,
        y: Math.random() * 64 - 32,
        angle: Math.random() * Math.PI * 2,
      },
    }
    this.state.progress = 0
    this.state.time = 0
    renderer.resize(scale)
    this.draw()
    gsap.set(this.canvas, { opacity: 1 })
    this.canvas.classList.add('is-active')
    applyTheme(to)
    this.onThemeChange?.(to)

    this.tween = gsap.to(this.state, {
      progress: 1,
      duration: inkParams.duration,
      ease: EASE,
      onUpdate: () => {
        this.state.time = this.tween?.time() ?? 0
        this.draw()
      },
      onComplete: () => this.finish(),
    })
    this.tween.timeScale(inkParams.timeScale)
  }

  destroy(): void {
    this.destroyed = true
    this.captureGeneration += 1
    this.cancel()
    window.clearTimeout(this.resizeTimer)
    window.clearTimeout(this.cssFadeTimer)
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('impulsafund:route-ready', this.handleRouteChange)
    this.reducedMotion.removeEventListener('change', this.handleMotionChange)
    this.resizeObserver?.disconnect()
  }

  private readonly handleResize = () => {
    this.renderer?.resize(renderScale())
    if (this.frame) this.draw()
    this.scheduleCapture(RESIZE_DEBOUNCE_MS)
  }

  private readonly handleMotionChange = () => this.scheduleCapture(0)

  private readonly handleRouteChange = () => {
    this.captureGeneration += 1
    this.captureQueued = true
    this.scheduleCapture(RESIZE_DEBOUNCE_MS)
  }

  private currentFrame(): InkFrame | null {
    if (!this.frame) return null
    const linear = Math.min(1, this.state.time / inkParams.duration)
    const ramp = Math.max(0, (linear - SPREAD.cleanupFrom) / (1 - SPREAD.cleanupFrom))
    const cleanup =
      ramp ** SPREAD.cleanupPower * this.frame.maxDist * SPREAD.cleanupReach +
      Math.max(0, (linear - 0.97) / 0.03) * this.frame.maxDist
    return {
      ...this.frame,
      progress: this.state.progress,
      time: this.state.time,
      radius: this.state.progress * this.frame.maxDist * SPREAD.growth,
      cleanup,
    }
  }

  private draw(): void {
    const frame = this.currentFrame()
    if (this.renderer && frame) this.renderer.draw(frame)
  }

  private finish(): void {
    this.tween = null
    this.fade = gsap
      .to(this.canvas, {
        opacity: 0,
        duration: FADE_OUT_SECONDS,
        ease: 'none',
        onComplete: () => this.hide(),
      })
      .timeScale(inkParams.timeScale)
  }

  private hide(): void {
    this.fade = null
    this.frame = null
    this.canvas.classList.remove('is-active')
    if (this.captureQueued) this.scheduleCapture(0)
  }

  private cancel(): void {
    this.tween?.kill()
    this.fade?.kill()
    this.tween = null
    this.hide()
  }

  private crossFade(to: Theme): void {
    const root = document.documentElement
    const useMotion = !this.reducedMotion.matches
    if (useMotion) {
      root.classList.add('theme-fade')
      root.style.setProperty('--theme-fade', `${CSS_FADE_SECONDS}s`)
    }
    applyTheme(to)
    this.onThemeChange?.(to)
    window.clearTimeout(this.cssFadeTimer)
    this.cssFadeTimer = window.setTimeout(() => {
      root.classList.remove('theme-fade')
      if (this.captureQueued) this.scheduleCapture(0)
    }, useMotion ? CSS_FADE_SECONDS * 1000 + 50 : 0)
  }

  private scheduleCapture(delay: number): void {
    if (this.destroyed) return
    window.clearTimeout(this.resizeTimer)
    this.resizeTimer = window.setTimeout(() => void this.captureAll(), delay)
  }

  private async captureAll(): Promise<void> {
    const renderer = this.renderer
    if (!renderer || renderer.isLost || this.reducedMotion.matches || this.destroyed) return
    if (this.capturing || this.frame || document.documentElement.classList.contains('theme-fade')) {
      this.captureQueued = true
      return
    }

    const scale = renderScale()
    const key = layoutKey(scale)
    const current = getTheme()
    const themes: Theme[] = [current, otherTheme(current)].filter(
      theme => !renderer.hasValid(theme, key),
    )
    this.captureQueued = false
    if (themes.length === 0) return

    const generation = ++this.captureGeneration
    this.capturing = true
    try {
      for (const theme of themes) {
        const snapshot = await capturePage(theme, scale, renderer.maxTextureSize)
        if (generation !== this.captureGeneration || this.destroyed) return
        if (snapshot.key !== layoutKey(renderScale())) {
          this.captureQueued = true
          break
        }
        renderer.upload(snapshot)
        if (import.meta.env.DEV) {
          console.debug(
            `[ink] ${theme} ${snapshot.canvas.width}×${snapshot.canvas.height} ${snapshot.ms.toFixed(0)}ms`,
          )
        }
      }
    } catch (error) {
      console.warn('[ink] WebGL capture unavailable; CSS fallback remains active.', error)
    } finally {
      this.capturing = false
    }
    if (this.captureQueued) this.scheduleCapture(RESIZE_DEBOUNCE_MS)
  }
}

function farthestCorner(point: InkPoint): number {
  const width = document.documentElement.clientWidth
  const height = document.documentElement.clientHeight
  return Math.max(
    Math.hypot(point.x, point.y),
    Math.hypot(width - point.x, point.y),
    Math.hypot(point.x, height - point.y),
    Math.hypot(width - point.x, height - point.y),
  ) + 4
}
