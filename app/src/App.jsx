import { Component, useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/Layout/Layout'
import LoadingScreen from './components/LoadingScreen/LoadingScreen'
import Onboarding from './components/Onboarding/Onboarding'
import TutorialOverlay from './components/TutorialOverlay/TutorialOverlay'
import QuickCapture from './components/QuickCapture/QuickCapture'
import GlobalSearch from './components/GlobalSearch/GlobalSearch'
import useThemeStore from './stores/useThemeStore'
import useTutorialStore from './stores/useTutorialStore'
import useMilestoneStore from './stores/useMilestoneStore'

//const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'))
//const Journal = lazy(() => import('./pages/Journal/Journal'))
//const Artifacts = lazy(() => import('./pages/Artifacts/Artifacts'))
//const Timeline = lazy(() => import('./pages/Timeline/Timeline'))
const Insights = lazy(() => import('./pages/Insights/Insights'))
const Settings = lazy(() => import('./pages/Settings/Settings'))
const Finance = lazy(() => import('./pages/Finance/Finance'))
const AIAssistant = lazy(() => import('./pages/AIAssistant/AIAssistant'))

class ErrorBoundary extends Component {
  state = { hasError: false, errorMsg: '' }
  static getDerivedStateFromError(error) { return { hasError: true, errorMsg: error?.message || 'Unknown error' } }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info?.componentStack) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, background: '#0d0f1a', color: '#e2e8f0', padding: 24 }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#94a3b8', maxWidth: 480, textAlign: 'center', fontSize: 13, wordBreak: 'break-word' }}>{this.state.errorMsg}</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => { this.setState({ hasError: false, errorMsg: '' }); window.location.hash = '#/'; window.location.reload() }}
              style={{ padding: '8px 20px', borderRadius: 8, background: '#334155', color: '#e2e8f0', border: 'none', cursor: 'pointer', fontSize: 14 }}
            >
              Go Home
            </button>
            <button
              onClick={() => { localStorage.clear(); window.location.hash = '#/'; window.location.reload() }}
              style={{ padding: '8px 20px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}
            >
              Reset &amp; Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const hydrate = useThemeStore((s) => s.hydrate)
  const [loading, setLoading] = useState(true)

  const hasCompletedOnboarding = useTutorialStore((s) => s.hasCompletedOnboarding)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const handleLoadingDone = () => {
    setLoading(false)
    /* Check milestone notifications for returning users */
    if (hasCompletedOnboarding) {
      setTimeout(() => useMilestoneStore.getState().checkNotifications(), 1200)
    }
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {loading && <LoadingScreen key="loader" onDone={handleLoadingDone} />}
      </AnimatePresence>

      {/* Onboarding wizard — shown once for new users */}
      {!loading && !hasCompletedOnboarding && <Onboarding />}

      {/* Main app — shown after onboarding is done */}
      {!loading && hasCompletedOnboarding && (
        <ErrorBoundary>
          <TutorialOverlay />
          <QuickCapture />
          <GlobalSearch />
          <Suspense fallback={null}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/artifacts" element={<Artifacts />} />
                <Route path="/timeline" element={<Timeline />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/assistant" element={<AIAssistant />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  )
}
