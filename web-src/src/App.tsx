import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './lib/store/useAuthStore'
import { useNostrStore } from './lib/store/useNostrStore'
import { Layout } from './components/Layout'
import { FeedPage } from './pages/FeedPage'
import { ThreadPage } from './pages/ThreadPage'
import { ProfilePage } from './pages/ProfilePage'
import { NotificationsPage } from './pages/NotificationsPage'
import { MessagesPage } from './pages/MessagesPage'
import { SearchPage } from './pages/SearchPage'
import { BookmarksPage } from './pages/BookmarksPage'
import { SettingsPage } from './pages/SettingsPage'
import { MarketplacePage } from './pages/MarketplacePage'
import { VideoGalleryPage } from './pages/VideoGalleryPage'
import { SparkWalletPage } from './pages/SparkWalletPage'
import { ArticlesPage } from './pages/ArticlesPage'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Error captured by boundary; keep console clean of sensitive state.
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--postilla-bg)] text-[var(--postilla-text)] flex flex-col items-center justify-center p-6 text-center gap-3">
          <img src={import.meta.env.BASE_URL + "postilla-mark.svg"} alt="Postilla" className="w-12 h-12 rounded-xl" />
          <h1 className="text-lg font-bold">Something went wrong</h1>
          <p className="text-sm text-[#9a9890] max-w-sm">
            Postilla Web encountered an unexpected rendering error. Reloading will recover cleanly.
          </p>
          <button
            onClick={() => window.location.assign(import.meta.env.BASE_URL)}
            className="px-4 py-2 rounded-xl bg-[var(--postilla-accent)] hover:bg-[var(--postilla-accent-hover)] text-sm font-semibold cursor-pointer"
          >
            Back to Feed
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession)
  const pubkey = useAuthStore((s) => s.pubkey)
  const initPoolListener = useNostrStore((s) => s.initPoolListener)
  const loadUserGraph = useNostrStore((s) => s.loadUserGraph)
  const toastMessage = useNostrStore((s) => s.toastMessage)
  const setToast = useNostrStore((s) => s.setToast)

  useEffect(() => {
    void restoreSession()
    return initPoolListener()
  }, [restoreSession, initPoolListener])

  useEffect(() => {
    if (pubkey) {
      void loadUserGraph(pubkey)
    }
  }, [pubkey, loadUserGraph])

  useEffect(() => {
    if (!toastMessage) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toastMessage, setToast])

  return (
    <ErrorBoundary>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<FeedPage />} />
            <Route path="/e/:eventId" element={<ThreadPage />} />
            <Route path="/p/:pubkey" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/videos" element={<VideoGalleryPage />} />
            <Route path="/wallet" element={<SparkWalletPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </ErrorBoundary>
  )
}
