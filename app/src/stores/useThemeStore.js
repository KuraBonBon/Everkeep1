import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/*
 * Theme definitions — each key maps to a set of CSS custom property values.
 * Applied at runtime by writing to document.documentElement.style.
 */
export const themes = {
  'dark-academic': {
    label: 'Dark Academic',
    preview: 'linear-gradient(135deg, #0f1117, #1c1f2e, #818cf8)',
    vars: {
      '--bg-primary': '#0f1117',
      '--bg-secondary': '#161822',
      '--bg-tertiary': '#1c1f2e',
      '--bg-card': '#1a1d2b',
      '--bg-card-hover': '#22263a',
      '--bg-elevated': '#242840',
      '--text-primary': '#e8eaf0',
      '--text-secondary': '#9ca3b4',
      '--text-muted': '#6b7280',
      '--text-accent': '#818cf8',
      '--accent-primary': '#818cf8',
      '--accent-secondary': '#6366f1',
      '--accent-gradient': 'linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #4f46e5 100%)',
      '--accent-glow': 'rgba(129, 140, 248, 0.15)',
      '--border-color': 'rgba(255, 255, 255, 0.06)',
      '--border-active': 'rgba(129, 140, 248, 0.3)',
      '--shadow-sm': '0 1px 3px rgba(0,0,0,0.3)',
      '--shadow-md': '0 4px 12px rgba(0,0,0,0.4)',
      '--shadow-lg': '0 8px 30px rgba(0,0,0,0.5)',
      '--shadow-glow': '0 0 20px rgba(129, 140, 248, 0.1)',
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--danger': '#f87171',
      '--info': '#60a5fa',
      '--scrollbar-thumb': 'rgba(255,255,255,0.1)',
      '--scrollbar-thumb-hover': 'rgba(255,255,255,0.2)',
      '--selection-bg': '#818cf8',
    },
  },

  'light-classic': {
    label: 'Light Classic',
    preview: 'linear-gradient(135deg, #f8fafc, #e2e8f0, #6366f1)',
    vars: {
      '--bg-primary': '#f4f6f9',
      '--bg-secondary': '#ffffff',
      '--bg-tertiary': '#eef1f5',
      '--bg-card': '#ffffff',
      '--bg-card-hover': '#f8f9fb',
      '--bg-elevated': '#ffffff',
      '--text-primary': '#1e293b',
      '--text-secondary': '#64748b',
      '--text-muted': '#94a3b8',
      '--text-accent': '#6366f1',
      '--accent-primary': '#6366f1',
      '--accent-secondary': '#4f46e5',
      '--accent-gradient': 'linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #4f46e5 100%)',
      '--accent-glow': 'rgba(99, 102, 241, 0.1)',
      '--border-color': 'rgba(0, 0, 0, 0.08)',
      '--border-active': 'rgba(99, 102, 241, 0.35)',
      '--shadow-sm': '0 1px 3px rgba(0,0,0,0.06)',
      '--shadow-md': '0 4px 12px rgba(0,0,0,0.08)',
      '--shadow-lg': '0 8px 30px rgba(0,0,0,0.1)',
      '--shadow-glow': '0 0 20px rgba(99, 102, 241, 0.08)',
      '--success': '#16a34a',
      '--warning': '#d97706',
      '--danger': '#dc2626',
      '--info': '#2563eb',
      '--scrollbar-thumb': 'rgba(0,0,0,0.12)',
      '--scrollbar-thumb-hover': 'rgba(0,0,0,0.2)',
      '--selection-bg': '#6366f1',
    },
  },

  'ocean-blue': {
    label: 'Ocean Blue',
    preview: 'linear-gradient(135deg, #0c1222, #1e3a5f, #38bdf8)',
    vars: {
      '--bg-primary': '#0b1120',
      '--bg-secondary': '#0f1729',
      '--bg-tertiary': '#152036',
      '--bg-card': '#121c30',
      '--bg-card-hover': '#1a2742',
      '--bg-elevated': '#1e2d4a',
      '--text-primary': '#e0ecf8',
      '--text-secondary': '#8ba4c4',
      '--text-muted': '#5e7da0',
      '--text-accent': '#38bdf8',
      '--accent-primary': '#38bdf8',
      '--accent-secondary': '#0ea5e9',
      '--accent-gradient': 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%)',
      '--accent-glow': 'rgba(56, 189, 248, 0.12)',
      '--border-color': 'rgba(255, 255, 255, 0.06)',
      '--border-active': 'rgba(56, 189, 248, 0.3)',
      '--shadow-sm': '0 1px 3px rgba(0,0,0,0.35)',
      '--shadow-md': '0 4px 12px rgba(0,0,0,0.45)',
      '--shadow-lg': '0 8px 30px rgba(0,0,0,0.55)',
      '--shadow-glow': '0 0 20px rgba(56, 189, 248, 0.1)',
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--danger': '#f87171',
      '--info': '#38bdf8',
      '--scrollbar-thumb': 'rgba(255,255,255,0.1)',
      '--scrollbar-thumb-hover': 'rgba(255,255,255,0.2)',
      '--selection-bg': '#0ea5e9',
    },
  },

  'forest-green': {
    label: 'Forest Green',
    preview: 'linear-gradient(135deg, #0a120a, #1a3a1a, #34d399)',
    vars: {
      '--bg-primary': '#0a110c',
      '--bg-secondary': '#0f1912',
      '--bg-tertiary': '#15221a',
      '--bg-card': '#121d16',
      '--bg-card-hover': '#1b2d22',
      '--bg-elevated': '#1f3528',
      '--text-primary': '#e0f0e6',
      '--text-secondary': '#89b09a',
      '--text-muted': '#5e8870',
      '--text-accent': '#34d399',
      '--accent-primary': '#34d399',
      '--accent-secondary': '#10b981',
      '--accent-gradient': 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)',
      '--accent-glow': 'rgba(52, 211, 153, 0.12)',
      '--border-color': 'rgba(255, 255, 255, 0.05)',
      '--border-active': 'rgba(52, 211, 153, 0.3)',
      '--shadow-sm': '0 1px 3px rgba(0,0,0,0.35)',
      '--shadow-md': '0 4px 12px rgba(0,0,0,0.45)',
      '--shadow-lg': '0 8px 30px rgba(0,0,0,0.55)',
      '--shadow-glow': '0 0 20px rgba(52, 211, 153, 0.1)',
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--danger': '#f87171',
      '--info': '#60a5fa',
      '--scrollbar-thumb': 'rgba(255,255,255,0.1)',
      '--scrollbar-thumb-hover': 'rgba(255,255,255,0.18)',
      '--selection-bg': '#10b981',
    },
  },

  'midnight-rose': {
    label: 'Midnight Rose',
    preview: 'linear-gradient(135deg, #1a0a14, #2d1228, #f472b6)',
    vars: {
      '--bg-primary': '#110910',
      '--bg-secondary': '#1a0f18',
      '--bg-tertiary': '#231522',
      '--bg-card': '#1d111c',
      '--bg-card-hover': '#2c1a2a',
      '--bg-elevated': '#331e30',
      '--text-primary': '#f0e4ee',
      '--text-secondary': '#b898b2',
      '--text-muted': '#8a6884',
      '--text-accent': '#f472b6',
      '--accent-primary': '#f472b6',
      '--accent-secondary': '#ec4899',
      '--accent-gradient': 'linear-gradient(135deg, #f472b6 0%, #ec4899 50%, #db2777 100%)',
      '--accent-glow': 'rgba(244, 114, 182, 0.12)',
      '--border-color': 'rgba(255, 255, 255, 0.05)',
      '--border-active': 'rgba(244, 114, 182, 0.3)',
      '--shadow-sm': '0 1px 3px rgba(0,0,0,0.35)',
      '--shadow-md': '0 4px 12px rgba(0,0,0,0.45)',
      '--shadow-lg': '0 8px 30px rgba(0,0,0,0.55)',
      '--shadow-glow': '0 0 20px rgba(244, 114, 182, 0.1)',
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--danger': '#f87171',
      '--info': '#60a5fa',
      '--scrollbar-thumb': 'rgba(255,255,255,0.1)',
      '--scrollbar-thumb-hover': 'rgba(255,255,255,0.18)',
      '--selection-bg': '#ec4899',
    },
  },

  'amber-dusk': {
    label: 'Amber Dusk',
    preview: 'linear-gradient(135deg, #151008, #2d2010, #f59e0b)',
    vars: {
      '--bg-primary': '#12100a',
      '--bg-secondary': '#1a1610',
      '--bg-tertiary': '#221e16',
      '--bg-card': '#1c1812',
      '--bg-card-hover': '#2a241a',
      '--bg-elevated': '#322b1f',
      '--text-primary': '#f0ece2',
      '--text-secondary': '#b8a88e',
      '--text-muted': '#8a7a62',
      '--text-accent': '#f59e0b',
      '--accent-primary': '#f59e0b',
      '--accent-secondary': '#d97706',
      '--accent-gradient': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
      '--accent-glow': 'rgba(245, 158, 11, 0.12)',
      '--border-color': 'rgba(255, 255, 255, 0.05)',
      '--border-active': 'rgba(245, 158, 11, 0.3)',
      '--shadow-sm': '0 1px 3px rgba(0,0,0,0.35)',
      '--shadow-md': '0 4px 12px rgba(0,0,0,0.45)',
      '--shadow-lg': '0 8px 30px rgba(0,0,0,0.55)',
      '--shadow-glow': '0 0 20px rgba(245, 158, 11, 0.1)',
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--danger': '#f87171',
      '--info': '#60a5fa',
      '--scrollbar-thumb': 'rgba(255,255,255,0.1)',
      '--scrollbar-thumb-hover': 'rgba(255,255,255,0.18)',
      '--selection-bg': '#d97706',
    },
  },

  'spisot': {
    label: 'SPIST Pride',
    preview: 'linear-gradient(135deg, #0d1a0d, #1a5c2a, #c8a415, #2e7d32)',
    vars: {
      '--bg-primary': '#0c120c',
      '--bg-secondary': '#111a12',
      '--bg-tertiary': '#182419',
      '--bg-card': '#141e15',
      '--bg-card-hover': '#1e2f20',
      '--bg-elevated': '#243826',
      '--text-primary': '#eef2e9',
      '--text-secondary': '#a4b89a',
      '--text-muted': '#6e8966',
      '--text-accent': '#d4af37',
      '--accent-primary': '#d4af37',
      '--accent-secondary': '#2e7d32',
      '--accent-gradient': 'linear-gradient(135deg, #d4af37 0%, #b8962e 40%, #2e7d32 100%)',
      '--accent-glow': 'rgba(212, 175, 55, 0.14)',
      '--border-color': 'rgba(255, 255, 255, 0.05)',
      '--border-active': 'rgba(212, 175, 55, 0.35)',
      '--shadow-sm': '0 1px 3px rgba(0,0,0,0.35)',
      '--shadow-md': '0 4px 12px rgba(0,0,0,0.45)',
      '--shadow-lg': '0 8px 30px rgba(0,0,0,0.55)',
      '--shadow-glow': '0 0 20px rgba(212, 175, 55, 0.1)',
      '--success': '#43a047',
      '--warning': '#d4af37',
      '--danger': '#e53935',
      '--info': '#66bb6a',
      '--scrollbar-thumb': 'rgba(255,255,255,0.1)',
      '--scrollbar-thumb-hover': 'rgba(255,255,255,0.18)',
      '--selection-bg': '#2e7d32',
    },
  },
}

/**
 * Apply a theme's CSS variables to the document root.
 */
function applyThemeToDOM(themeId) {
  const theme = themes[themeId]
  if (!theme) return
  const root = document.documentElement
  Object.entries(theme.vars).forEach(([prop, value]) => {
    root.style.setProperty(prop, value)
  })
}

/**
 * Zustand store — persisted to localStorage.
 */
const useThemeStore = create(
  persist(
    (set, get) => ({
      activeTheme: 'dark-academic',

      setTheme: (themeId) => {
        if (!themes[themeId]) return
        applyThemeToDOM(themeId)
        set({ activeTheme: themeId })
      },

      // Call on app mount to re-apply the persisted theme
      hydrate: () => {
        applyThemeToDOM(get().activeTheme)
      },
    }),
    {
      name: 'campus-chronicle-theme',
    }
  )
)

export default useThemeStore
