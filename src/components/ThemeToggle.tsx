import { useEffect, useRef, useState } from 'react'
import { InkTransition } from '../theme/InkTransition'
import { inkParams } from '../theme/gl/params'
import { getTheme, type Theme } from '../theme/theme'

const textEntrySelector =
  'input:not([type="range"]):not([type="checkbox"]):not([type="button"]), textarea, select, [contenteditable="true"]'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getTheme())
  const transition = useRef<InkTransition | null>(null)

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.className = 'ink-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    canvas.setAttribute('data-html2canvas-ignore', '')
    document.body.append(canvas)
    const ink = new InkTransition(canvas, { onThemeChange: setTheme })
    transition.current = ink

    const handleShortcut = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== 't' ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) return
      const target = event.target
      if (target instanceof Element && target.closest(textEntrySelector)) return
      event.preventDefault()
      ink.toggle()
    }
    window.addEventListener('keydown', handleShortcut)

    if (import.meta.env.DEV) {
      Object.assign(window, { __impulsaInkParams: inkParams })
    }

    return () => {
      window.removeEventListener('keydown', handleShortcut)
      ink.destroy()
      transition.current = null
      canvas.remove()
    }
  }, [])

  const nextTheme = theme === 'dark' ? 'claro' : 'oscuro'

  return (
    <button
      type="button"
      data-ink-live
      aria-label={`Activar modo ${nextTheme}`}
      aria-pressed={theme === 'dark'}
      title={`Modo ${nextTheme} (atajo: T)`}
      onClick={event => {
        transition.current?.toggle(
          event.detail === 0 ? undefined : { x: event.clientX, y: event.clientY },
        )
      }}
      className="theme-toggle relative w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.36-6.36l-1.42 1.42M7.06 16.94l-1.42 1.42m12.72 0l-1.42-1.42M7.06 7.06L5.64 5.64M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.35 15.35A9 9 0 118.65 3.65 7 7 0 0020.35 15.35z" />
        </svg>
      )}
      <span className="sr-only">Modo {nextTheme}</span>
    </button>
  )
}
