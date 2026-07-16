import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* ── Interactive tutorial step definitions ───────────────────────
   type: 'info'  → passive tooltip with Next/Back buttons
   type: 'click' → waits for user to click the highlighted target
   route:        → auto-navigate here when reaching this step
   navigateTo:   → navigate here when the click-zone is clicked
───────────────────────────────────────────────────────────────── */
export const TUTORIAL_STEPS = [
  /* ── Welcome ─────────────────── */
  {
    id: 'welcome',
    type: 'info',
    target: null,
    title: 'Welcome to the Guided Tour! 🎓',
    body: 'Let\'s walk through every section of Everkeep together.\nFollow the prompts — click where indicated to explore each area.\nYou can skip this tour at any time.',
    position: 'center',
    group: 'intro',
  },
  {
    id: 'sidebar-intro',
    type: 'info',
    target: '.sidebar',
    title: 'Navigation Sidebar',
    body: 'This sidebar gives you one-click access to every section.\nThe active page is highlighted with an animated indicator.',
    position: 'right',
    group: 'intro',
    route: '/dashboard',
  },
  /* ── Dashboard ───────────────── */
  {
    id: 'dashboard-info',
    type: 'info',
    target: null,
    title: 'Dashboard — Your Home Base',
    body: 'The Dashboard gives you a bird\'s-eye view:\n• Recent journal entries & writing streak\n• Upcoming milestones & deadlines\n• Financial summaries & charts\n• Category activity at a glance',
    position: 'center',
    group: 'dashboard',
    route: '/dashboard',
  },
  /* ── Journal ─────────────────── */
  {
    id: 'go-journal',
    type: 'click',
    target: '.sidebar__link[href="#/journal"], .sidebar__link[href$="/journal"]',
    title: 'Open the Journal',
    body: 'Click the Journal link in the sidebar to continue.',
    position: 'right',
    group: 'journal',
    navigateTo: '/journal',
  },
  {
    id: 'journal-info',
    type: 'info',
    target: null,
    title: 'Reflection Journal ✍️',
    body: 'Write daily reflections, tag entries, and build a searchable archive.\n• Tag entries for easy filtering\n• Link entries to categories\n• AI analysis of writing patterns\n• Track your writing streak',
    position: 'center',
    group: 'journal',
    route: '/journal',
  },
  /* ── Artifacts ───────────────── */
  {
    id: 'go-artifacts',
    type: 'click',
    target: '.sidebar__link[href="#/artifacts"], .sidebar__link[href$="/artifacts"]',
    title: 'Open the Artifact Vault',
    body: 'Click Artifacts in the sidebar to continue.',
    position: 'right',
    group: 'artifacts',
    navigateTo: '/artifacts',
  },
  {
    id: 'artifacts-info',
    type: 'info',
    target: null,
    title: 'Artifact Vault 📁',
    body: 'Upload and organize documents, images, code, and more.\n• Stored locally — never leaves your device\n• Link artifacts to milestones\n• Preview and download anytime\n• Organize by type and category',
    position: 'center',
    group: 'artifacts',
    route: '/artifacts',
  },
  /* ── Timeline ────────────────── */
  {
    id: 'go-timeline',
    type: 'click',
    target: '.sidebar__link[href="#/timeline"], .sidebar__link[href$="/timeline"]',
    title: 'Open the Timeline',
    body: 'Click Timeline in the sidebar to continue.',
    position: 'right',
    group: 'timeline',
    navigateTo: '/timeline',
  },
  {
    id: 'timeline-info',
    type: 'info',
    target: null,
    title: 'Milestone Timeline 🎯',
    body: 'Track deadlines, project goals, and achievements over time.\n• Create milestones with dates\n• Mark as upcoming, in-progress, or completed\n• Desktop notifications for deadlines\n• Visual progress tracking',
    position: 'center',
    group: 'timeline',
    route: '/timeline',
  },
  /* ── AI Insights ─────────────── */
  {
    id: 'go-insights',
    type: 'click',
    target: '.sidebar__link[href="#/insights"], .sidebar__link[href$="/insights"]',
    title: 'Open AI Insights',
    body: 'Click AI Insights in the sidebar to continue.',
    position: 'right',
    group: 'insights',
    navigateTo: '/insights',
  },
  {
    id: 'insights-info',
    type: 'info',
    target: null,
    title: 'AI Insights 🤖',
    body: 'Get AI-powered analysis of your journal entries,\nmilestones, and finances — summaries, patterns,\nand weekly reflections.\n\nBring Your Own API Key (OpenAI, Google, etc.) in Settings.',
    position: 'center',
    group: 'insights',
    route: '/insights',
  },
  /* ── Finance ─────────────────── */
  {
    id: 'go-finance',
    type: 'click',
    target: '.sidebar__link[href="#/finance"], .sidebar__link[href$="/finance"]',
    title: 'Open Finance Tracker',
    body: 'Click Finance in the sidebar to continue.',
    position: 'right',
    group: 'finance',
    navigateTo: '/finance',
  },
  {
    id: 'finance-info',
    type: 'info',
    target: null,
    title: 'Finance Tracker 💰',
    body: 'Track income and expenses, set budgets, and visualize spending.\n• Add income & expense transactions\n• Set budgets per category\n• Pie & bar charts for breakdowns\n• Monthly summaries & trends',
    position: 'center',
    group: 'finance',
    route: '/finance',
  },
  /* ── AI Assistant ──────────────── */
  {
    id: 'go-assistant',
    type: 'click',
    target: '.sidebar__link[href="#/assistant"], .sidebar__link[href$="/assistant"]',
    title: 'Open AI Assistant',
    body: 'Click AI Assistant in the sidebar to continue.',
    position: 'right',
    group: 'assistant',
    navigateTo: '/assistant',
  },
  {
    id: 'assistant-info',
    type: 'info',
    target: null,
    title: 'AI Assistant 💬',
    body: 'Chat with an AI that knows Everkeep.\nIt can create journal entries, milestones, and transactions for you.\n\nSet Custom Instructions in the header to personalize\nall AI features across the entire app.',
    position: 'center',
    group: 'assistant',
    route: '/assistant',
  },
  /* ── Tips ─────────────────────── */
  {
    id: 'quick-capture',
    type: 'info',
    target: '.quick-capture__fab',
    title: 'Quick Capture ⚡',
    body: 'This floating button lets you quickly add a journal entry,\ntransaction, milestone, or artifact from anywhere.\nNo page switching needed!',
    position: 'left',
    group: 'tips',
  },
  {
    id: 'global-search',
    type: 'info',
    target: null,
    title: 'Search Everything 🔍',
    body: 'Press Ctrl + K (or Cmd + K on Mac) to open Global Search.\nFind any entry, artifact, milestone, or transaction\ninstantly across all modules.',
    position: 'center',
    group: 'tips',
  },
  /* ── Settings ────────────────── */
  {
    id: 'go-settings',
    type: 'click',
    target: '.sidebar__link[href="#/settings"], .sidebar__link[href$="/settings"]',
    title: 'Open Settings',
    body: 'Click Settings in the sidebar to continue.',
    position: 'right',
    group: 'settings',
    navigateTo: '/settings',
  },
  {
    id: 'settings-info',
    type: 'info',
    target: null,
    title: 'Settings ⚙️',
    body: 'Configure your profile, AI providers, themes,\ncategories, and export options.\nYou can also replay this tour from here!',
    position: 'center',
    group: 'settings',
    route: '/settings',
  },
  /* ── Done ─────────────────────── */
  {
    id: 'done',
    type: 'info',
    target: null,
    title: 'You\'re All Set! 🎉',
    body: 'That covers everything! Explore each section at your own pace.\nYou can replay this tour or view individual guides\nfrom Settings → Tutorial & Help.',
    position: 'center',
    group: 'done',
  },
]

/* ── Per-feature guide sets (for replay from Settings) ──────────── */
export const FEATURE_GUIDES = {
  dashboard: TUTORIAL_STEPS.filter((s) => s.group === 'dashboard'),
  journal: TUTORIAL_STEPS.filter((s) => s.group === 'journal'),
  artifacts: TUTORIAL_STEPS.filter((s) => s.group === 'artifacts'),
  timeline: TUTORIAL_STEPS.filter((s) => s.group === 'timeline'),
  insights: TUTORIAL_STEPS.filter((s) => s.group === 'insights'),
  finance: TUTORIAL_STEPS.filter((s) => s.group === 'finance'),
  assistant: TUTORIAL_STEPS.filter((s) => s.group === 'assistant'),
  settings: TUTORIAL_STEPS.filter((s) => s.group === 'settings'),
  tips: TUTORIAL_STEPS.filter((s) => s.group === 'tips'),
}

/* ── Store ──────────────────────────────────────────────────────── */
const useTutorialStore = create(
  persist(
    (set, get) => ({
      /* ── Persisted flags ────────── */
      hasCompletedOnboarding: false,
      hasSeenTutorial: false,

      /* ── Runtime state ──────────── */
      tutorialActive: false,
      currentStep: 0,
      activeSteps: TUTORIAL_STEPS,

      /* ── Onboarding ─────────────── */
      /** Complete onboarding. If startTour=true, begins guided tour immediately. */
      completeOnboarding: (startTour = false) => {
        if (startTour) {
          set({
            hasCompletedOnboarding: true,
            tutorialActive: true,
            currentStep: 0,
            activeSteps: TUTORIAL_STEPS,
          })
        } else {
          set({ hasCompletedOnboarding: true })
        }
      },

      /** Reset onboarding (shows it again on next render) */
      resetOnboarding: () =>
        set({ hasCompletedOnboarding: false, hasSeenTutorial: false, tutorialActive: false, currentStep: 0 }),

      /* ── Tutorial ───────────────── */
      startTutorial: () =>
        set({ tutorialActive: true, currentStep: 0, activeSteps: TUTORIAL_STEPS }),

      startFeatureGuide: (key) => {
        const steps = FEATURE_GUIDES[key]
        if (!steps?.length) return
        set({ tutorialActive: true, currentStep: 0, activeSteps: steps })
      },

      nextStep: () => {
        const { currentStep, activeSteps } = get()
        if (currentStep >= activeSteps.length - 1) {
          set({ tutorialActive: false, hasSeenTutorial: true, currentStep: 0 })
        } else {
          set({ currentStep: currentStep + 1 })
        }
      },

      prevStep: () => {
        const { currentStep } = get()
        if (currentStep > 0) set({ currentStep: currentStep - 1 })
      },

      skipTutorial: () => set({ tutorialActive: false, hasSeenTutorial: true, currentStep: 0 }),

      resetTutorial: () => set({ hasSeenTutorial: false, tutorialActive: false, currentStep: 0 }),
    }),
    {
      name: 'campus-chronicle-tutorial',
      partialize: (s) => ({
        hasCompletedOnboarding: s.hasCompletedOnboarding,
        hasSeenTutorial: s.hasSeenTutorial,
      }),
    }
  )
)

export default useTutorialStore
