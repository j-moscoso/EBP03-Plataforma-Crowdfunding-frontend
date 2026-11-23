export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'impulsafund-theme'
const root = document.documentElement

function storedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function getTheme(): Theme {
  return root.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function otherTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark'
}

export function applyTheme(theme: Theme, persist = true): void {
  root.dataset.theme = theme
  root.style.colorScheme = theme
  if (!persist) return
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // The theme still works when storage is blocked.
  }
}

const initialTheme =
  storedTheme() ??
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
applyTheme(initialTheme, false)
