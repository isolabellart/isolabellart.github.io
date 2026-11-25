import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as nip19 from 'nostr-tools/nip19'
import type { Event } from 'nostr-tools/pure'
import { Search, Loader2 } from 'lucide-react'
import { nostrPool } from '../lib/nostr/pool'
import { useNostrStore } from '../lib/store/useNostrStore'
import { useSettingsStore } from '../lib/store/useSettingsStore'
import { NoteCard } from '../components/NoteCard'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const ingestEvent = useNostrStore((s) => s.ingestEvent)
  const fetchProfiles = useNostrStore((s) => s.fetchProfiles)
  const isEventMuted = useNostrStore((s) => s.isEventMuted)
  const relays = useSettingsStore((s) => s.relays)
  const searchRelays = useSettingsStore((s) => s.searchRelays)
  const readRelays = useMemo(
    () => relays.filter((r) => r.read).map((r) => r.url),
    [relays],
  )

  const initialQ = params.get('q') || ''
  const [query, setQuery] = useState(initialQ)
  const [results, setResults] = useState<Event[]>([])
  const [searching, setSearching] = useState(false)

  const runSearch = async (raw: string) => {
    const q = raw.trim()
    if (!q) return

    // Direct jump for npub / note / nevent / 64-hex pubkey
    const lower = q.toLowerCase()
    if (lower.startsWith('npub1') || lower.startsWith('nprofile1')) {
      navigate(`/p/${q}`)
      return
    }
    if (lower.startsWith('note1') || lower.startsWith('nevent1')) {
      try {
        const dec = nip19.decode(lower)
        if (dec.type === 'note') {
          navigate(`/e/${dec.data}`)
          return
        }
        if (dec.type === 'nevent') {
          navigate(`/e/${dec.data.id}`)
          return
        }
      } catch {
        // fall through to text search
      }
    }
    if (/^[0-9a-f]{64}$/i.test(lower)) {
      navigate(`/p/${lower}`)
      return
    }

    if (lower.startsWith('naddr1')) {
      setSearching(true)
      try {
        const decoded = nip19.decode(lower)
        if (decoded.type === 'naddr') {
          const events = await nostrPool.query(
            [...new Set([...searchRelays, ...readRelays])],
            { kinds: [decoded.data.kind], authors: [decoded.data.pubkey], '#d': [decoded.data.identifier], limit: 5 },
            5000,
          )
          const filtered = events.filter((event) => !isEventMuted(event))
          for (const event of filtered) ingestEvent(event)
          void fetchProfiles(filtered.map((event) => event.pubkey))
          setResults(filtered)
          return
        }
      } catch {
        // Invalid address; continue with contextual text search.
      } finally {
        setSearching(false)
      }
    }

    setSearching(true)
    try {
      const cleanTag = q.startsWith('#') ? q.slice(1).toLowerCase() : null
      const filter = cleanTag
        ? { kinds: [1, 20, 21, 22, 30023], '#t': [cleanTag], limit: 50 }
        : { kinds: [1, 20, 21, 22, 30023], search: q, limit: 40 }

      const targetRelays = cleanTag
        ? readRelays
        : [...new Set([...searchRelays, ...readRelays])]

      const evs = await nostrPool.query(targetRelays, filter, 5000)
      const filtered = evs.filter((e) => !isEventMuted(e))
      for (const e of filtered) ingestEvent(e)
      void fetchProfiles(filtered.map((e) => e.pubkey))
      setResults(filtered)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    if (initialQ) {
      setQuery(initialQ)
      void runSearch(initialQ)
    }
  }, [initialQ])

  return (
    <div>
      <div className="sticky top-[52px] md:top-0 z-20 bg-[var(--postilla-bg)]/90 backdrop-blur-md border-b border-[var(--postilla-border)] p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setParams(query.trim() ? { q: query.trim() } : {})
            void runSearch(query)
          }}
          className="flex gap-2"
        >
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[var(--postilla-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search #hashtag, text, npub1…, or note1…"
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-[var(--postilla-surface)] border border-[var(--postilla-border-strong)] text-sm focus:outline-none focus:border-[var(--postilla-accent)]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[var(--postilla-accent)] hover:bg-[var(--postilla-accent-hover)] text-sm font-semibold cursor-pointer"
          >
            Go
          </button>
        </form>
      </div>

      {searching ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--postilla-accent)]" />
        </div>
      ) : results.length === 0 ? (
        <div className="p-10 text-center text-sm text-[var(--postilla-secondary)]">
          Try searching a hashtag like <span className="text-[var(--postilla-accent)]">#nostr</span> or{' '}
          <span className="text-[var(--postilla-accent)]">#bitcoin</span>, or paste any <code>npub1</code> /{' '}
          <code>note1</code>.
        </div>
      ) : (
        results.map((ev) => <NoteCard key={ev.id} event={ev} />)
      )}
    </div>
  )
}
