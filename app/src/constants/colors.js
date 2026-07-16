/* ── Shared colour constants ──────────────────────────────────────
   Single source of truth for tag colours, category colours, and
   artifact type colours used across multiple pages.
   ──────────────────────────────────────────────────────────────── */

/**
 * TAG_COLOR_MAP — name-to-hex lookup used by Journal
 * getTagColor(tag) falls back to the CSS accent variable.
 */
export const TAG_COLOR_MAP = {
  Capstone: '#818cf8', Agile: '#60a5fa', 'CS 401': '#34d399',
  Database: '#fbbf24', General: '#9ca3b4', Growth: '#f472b6',
  Thesis: '#c084fc', 'UI/UX': '#fb923c', 'CS 301': '#34d399',
  Algorithms: '#60a5fa', Planning: '#fbbf24', OJT: '#f87171',
  Documentation: '#818cf8', Research: '#c084fc',
}
export const getTagColor = (tag) => TAG_COLOR_MAP[tag] || 'var(--accent-primary)'

/**
 * TAG_COLOR_PALETTE — ordered palette used by Insights when
 * assigning colours to dynamically-discovered tags by index.
 */
export const TAG_COLOR_PALETTE = [
  '#818cf8', '#34d399', '#60a5fa', '#f59e0b',
  '#10b981', '#c084fc', '#fb923c', '#f472b6',
]

/**
 * CATEGORY_COLORS — colour swatches for the category manager (Settings)
 */
export const CATEGORY_COLORS = [
  '#818cf8', '#60a5fa', '#34d399', '#fbbf24', '#f87171',
  '#c084fc', '#f472b6', '#fb923c', '#9ca3b4',
]

/**
 * typeColors — per-type colour for artifact icons/indicators
 */
export const typeColors = {
  document: '#818cf8',
  image:    '#f472b6',
  link:     '#60a5fa',
  code:     '#34d399',
  folder:   '#fbbf24',
}
