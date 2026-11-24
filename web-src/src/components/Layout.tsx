import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  Flame,
  Search,
  Bell,
  Mail,
  Bookmark,
  Settings,
  User,
  Smartphone,
  LogOut,
  LogIn,
  Cpu,
  ExternalLink,
  Radio,
  ShoppingBag,
  Video,
} from 'lucide-react'
import {
  ANDROID_APP_URL,
  DEFAULT_BLOSSOM_PRIMARY,
  FIREWISP_RELAY,
  ZAPSTORE_URL,
} from '../lib/constants'
import { useAuthStore } from '../lib/store/useAuthStore'
import { useNostrStore } from '../lib/store/useNostrStore'
import { Avatar } from './Avatar'
import { AuthModal } from './AuthModal'
import { ThemeToggle } from './ThemeToggle'

export function Layout({ children }: { children: ReactNode }) {
  const pubkey = useAuthStore((s) => s.pubkey)
  const method = useAuthStore((s) => s.method)
  const openAuthModal = useAuthStore((s) => s.openAuthModal)
  const logout = useAuthStore((s) => s.logout)
  const profile = useNostrStore((s) => (pubkey ? s.profiles[pubkey] : undefined))
  const relayStatuses = useNostrStore((s) => s.relayStatuses)
  const powBusyMessage = useNostrStore((s) => s.powBusyMessage)
  const toastMessage = useNostrStore((s) => s.toastMessage)
  const setToast = useNostrStore((s) => s.setToast)

  const connectedCount = Object.values(relayStatuses).filter((s) => s === 'connected').length
  const totalCount = Math.max(Object.keys(relayStatuses).length, 1)
  const firewispRelayUp = relayStatuses[FIREWISP_RELAY] === 'connected'

  const navItems = [
    { to: '/', label: 'Feed', icon: Flame, end: true },
    { to: '/search', label: 'Search', icon: Search },
    { to: '/notifications', label: 'Alerts', icon: Bell },
    { to: '/messages', label: 'Messages', icon: Mail },
    { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
    ...(pubkey ? [{ to: `/p/${pubkey}`, label: 'Profile', icon: User }] : []),
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { to: '/videos', label: 'Videos', icon: Video },
  ]

  return (
    <div className="min-h-screen bg-[var(--postilla-bg)] text-[var(--postilla-text)] flex justify-center">
      <div className="w-full max-w-6xl flex min-h-screen">
        {/* Left Sidebar (desktop) */}
        <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[var(--postilla-border)] px-3 py-4 sticky top-0 h-screen justify-between">
          <div>
            <Link to="/" className="flex items-center gap-2.5 px-3 py-2 mb-4">
              <img src={import.meta.env.BASE_URL + "postilla-mark.svg"} alt="Postilla" className="h-10 w-10 rounded-xl" />
              <div>
                <img src={import.meta.env.BASE_URL + "postilla-wordmark-light.svg"} alt="Postilla" className="postilla-wordmark-light h-6 w-auto" />
                <img src={import.meta.env.BASE_URL + "postilla-wordmark-dark.svg"} alt="Postilla" className="postilla-wordmark-dark h-6 w-auto" />
              </div>
            </Link>

            <nav className="space-y-1">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? 'bg-[var(--postilla-accent)]/15 text-[var(--postilla-accent)] border border-[var(--postilla-accent)]/25'
                        : 'text-[var(--postilla-secondary)] hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-5 px-2 space-y-3">
              <ThemeToggle />
              <a
                href={ANDROID_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[var(--postilla-inset)] border border-[var(--postilla-border)] hover:border-[var(--postilla-accent)]/50 transition"
              >
                <Smartphone className="w-4 h-4 text-[var(--postilla-accent)] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">Get Android App</div>
                  <div className="text-[11px] text-[var(--postilla-secondary)] truncate">
                    Direct APK &amp; Zapstore
                  </div>
                </div>
              </a>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--postilla-border)]">
            {pubkey ? (
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-[var(--postilla-surface)]">
                <Link to={`/p/${pubkey}`} className="flex items-center gap-2 min-w-0">
                  <Avatar
                    src={profile?.picture}
                    pubkey={pubkey}
                    name={profile?.display_name || profile?.name}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">
                      {profile?.display_name || profile?.name || `${pubkey.slice(0, 10)}…`}
                    </div>
                    <div className="text-[10px] text-[var(--postilla-secondary)] uppercase">{method}</div>
                  </div>
                </Link>
                <button
                  onClick={logout}
                  title="Sign out (wipes local key from memory)"
                  className="p-1.5 rounded-lg text-[var(--postilla-secondary)] hover:text-red-400 hover:bg-white/5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="w-full py-2.5 rounded-xl ember-gradient hover:opacity-95 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>
        </aside>

        {/* Main Center Column */}
        <main className="flex-1 min-w-0 border-r border-[var(--postilla-border)] pb-20 md:pb-6">
          {/* Mobile top bar */}
          <header className="md:hidden sticky top-0 z-30 bg-[var(--postilla-bg)]/90 backdrop-blur-md border-b border-[var(--postilla-border)] px-4 py-2.5 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={import.meta.env.BASE_URL + "postilla-mark.svg"} alt="Postilla" className="h-7 w-7 rounded-lg" />
              <img src={import.meta.env.BASE_URL + "postilla-wordmark-light.svg"} alt="Postilla" className="postilla-wordmark-light h-5 w-auto" />
              <img src={import.meta.env.BASE_URL + "postilla-wordmark-dark.svg"} alt="Postilla" className="postilla-wordmark-dark h-5 w-auto" />
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle compact />
              <a
                href={ANDROID_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-[var(--postilla-inset)] border border-[var(--postilla-border-strong)] text-xs text-[var(--postilla-accent)] flex items-center gap-1"
              >
                <Smartphone className="w-3.5 h-3.5" />
                App
              </a>
              {pubkey ? (
                <Link to={`/p/${pubkey}`}>
                  <Avatar
                    src={profile?.picture}
                    pubkey={pubkey}
                    name={profile?.display_name || profile?.name}
                    size="sm"
                  />
                </Link>
              ) : (
                <button
                  onClick={openAuthModal}
                  className="px-3 py-1 rounded-lg bg-[var(--postilla-accent)] text-xs font-semibold cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>
          </header>

          {children}
        </main>

        {/* Right Info Sidebar (large desktop) */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 px-4 py-4 gap-4 sticky top-0 h-screen overflow-y-auto">
          <div className="p-4 rounded-2xl bg-[var(--postilla-surface)] border border-[var(--postilla-border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--postilla-secondary)] flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[var(--postilla-accent)]" />
                Relay Network
              </span>
              <span className="text-xs text-emerald-400 font-medium">
                {connectedCount}/{totalCount} live
              </span>
            </div>
            <div className="text-xs text-[var(--postilla-secondary)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="truncate font-mono text-[11px]">firewisp.relay.rtard.de</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    firewispRelayUp ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
              </div>
              <p className="text-[11px] text-[var(--postilla-secondary)] leading-relaxed">
                Anti-spam community relay with NIP-13 PoW (12b+) &amp; rate limiting. Media uploads
                default to{' '}
                <span className="font-mono text-[var(--postilla-secondary)]">
                  {DEFAULT_BLOSSOM_PRIMARY.replace('https://', '')}
                </span>{' '}
                (configurable in Settings).
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--postilla-surface)] border border-[var(--postilla-border)] space-y-2.5">
            <h3 className="font-semibold text-sm text-white">Postilla for Android</h3>
            <p className="text-xs text-[var(--postilla-secondary)] leading-relaxed">
              The native application complements this browser client with device-integrated privacy and wallet features.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <a
                href={ANDROID_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-[var(--postilla-accent)] hover:bg-[var(--postilla-accent-hover)] text-xs font-semibold text-center text-white flex items-center justify-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Get Postilla on Zapstore
              </a>
              <a
                href={ZAPSTORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-[var(--postilla-inset)] hover:bg-[#262936] text-xs font-medium text-center text-[var(--postilla-secondary)] flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Also on Zapstore
              </a>
            </div>
          </div>

          <footer className="text-[11px] text-[#6f6d66] px-1 space-y-1">
            <div>Zero analytics · Zero trackers · Zero Google Sign-In</div>
            <div>
              Relay: <span className="font-mono">{FIREWISP_RELAY.replace('wss://', '')}</span>
            </div>
          </footer>
        </aside>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--postilla-bg)]/95 backdrop-blur-md border-t border-[var(--postilla-border)] flex justify-around py-2">
        {[
          { to: '/', icon: Flame, label: 'Feed', end: true },
          { to: '/search', icon: Search, label: 'Search' },
          { to: '/notifications', icon: Bell, label: 'Alerts' },
          { to: '/messages', icon: Mail, label: 'DMs' },
          { to: '/settings', icon: Settings, label: 'Settings' },
          { to: '/marketplace', icon: ShoppingBag, label: 'Market' },
          { to: '/videos', icon: Video, label: 'Videos' },
        ].map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[10px] px-2 py-0.5 ${
                isActive ? 'text-[#ff8a3d]' : 'text-[var(--postilla-secondary)]'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* PoW Mining Status Pill */}
      {powBusyMessage && (
        <div className="fixed bottom-16 md:bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#1a1c24] border border-[var(--postilla-accent)]/40 shadow-xl flex items-center gap-2 text-xs text-[var(--postilla-accent)]">
          <Cpu className="w-4 h-4 animate-pulse" />
          {powBusyMessage}
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && !powBusyMessage && (
        <button
          onClick={() => setToast(null)}
          className="fixed bottom-16 md:bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#1a1c24] border border-[#2f3344] shadow-xl text-xs text-[var(--postilla-text)] hover:border-[var(--postilla-accent)] cursor-pointer"
        >
          {toastMessage}
        </button>
      )}

      <AuthModal />
    </div>
  )
}
