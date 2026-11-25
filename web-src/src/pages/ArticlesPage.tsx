import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Plus, RefreshCw, Send, ExternalLink } from 'lucide-react'
import { useAuthStore } from '../lib/store/useAuthStore'
import { useNostrStore } from '../lib/store/useNostrStore'
import { useSettingsStore } from '../lib/store/useSettingsStore'
import { nostrPool } from '../lib/nostr/pool'
import { latestNostrArticles, type NostrArticle } from '../lib/nostr/articles'

export function ArticlesPage() {
  const signer = useAuthStore((s) => s.signer)
  const userWriteRelays = useNostrStore((s) => s.userWriteRelays)
  const settings = useSettingsStore()
  const [articles, setArticles] = useState<NostrArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [body, setBody] = useState('')
  const [topics, setTopics] = useState('')
  const [selected, setSelected] = useState<NostrArticle | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const relays = [...new Set([...settings.getReadRelays(), ...settings.searchRelays])]
      const events = await nostrPool.query(relays, { kinds: [30023], limit: 300 }, 10000)
      setArticles(latestNostrArticles(events))
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setLoading(false) }
  }, [settings.relays, settings.searchRelays])

  useEffect(() => { void refresh() }, [refresh])

  const publish = async () => {
    if (!signer?.canSign) { useAuthStore.getState().openAuthModal(); return }
    if (!title.trim() || !body.trim()) { setError('Title and Markdown content are required.'); return }
    setPublishing(true); setError(''); setNotice('')
    try {
      const d = crypto.randomUUID()
      const now = Math.floor(Date.now() / 1000)
      const tags: string[][] = [
        ['d', d], ['title', title.trim()], ['published_at', String(now)],
        ['client', 'Postilla'],
      ]
      if (summary.trim()) tags.push(['summary', summary.trim()])
      for (const topic of [...new Set(topics.split(/[,#\n]/).map((v) => v.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))]) {
        tags.push(['t', topic])
      }
      const event = await signer.signEvent({ kind: 30023, created_at: now, tags, content: body.trim() })
      const destinations = [...new Set([...settings.getWriteRelays(), ...userWriteRelays])]
      const results = await nostrPool.publish(destinations, event)
      const ok = results.filter((r) => r.ok).length
      if (!ok) throw new Error('No configured write relay confirmed the article.')
      setNotice(`Article published to ${ok}/${results.length} write relays.`)
      setShowEditor(false); setTitle(''); setSummary(''); setBody(''); setTopics('')
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setPublishing(false) }
  }

  return <div className="min-h-full">
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--postilla-border)] bg-[var(--postilla-bg)]/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-[var(--postilla-accent)]"/><h1 className="font-bold">Articles</h1><span className="text-xs text-[var(--postilla-secondary)]">NIP-23 · kind 30023</span></div>
      <div className="flex gap-2">
        <button onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-[var(--postilla-border)] p-2" title="Refresh"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/></button>
        <button onClick={() => setShowEditor((v) => !v)} className="inline-flex items-center gap-1 rounded-lg bg-[var(--postilla-accent)] px-3 py-2 text-xs font-semibold text-[#1B1916]"><Plus className="h-4 w-4"/>Write</button>
      </div>
    </header>
    {error && <p role="alert" className="m-3 rounded-lg bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
    {notice && <p role="status" className="m-3 rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-surface)] p-3 text-xs">{notice}</p>}
    {showEditor && <section className="m-3 space-y-3 rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)] p-4">
      <h2 className="font-semibold">New long-form article</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/>
      <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summary / preview" className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/>
      <input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="Topics, comma separated" className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your article in Markdown…" rows={12} className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-3 text-sm font-mono"/>
      <p className="text-xs text-[var(--postilla-secondary)]">Content is published as plain Markdown in a NIP-23 kind 30023 addressable event. HTML is not executed.</p>
      <div className="flex justify-end"><button disabled={publishing} onClick={() => void publish()} className="inline-flex items-center gap-2 rounded-lg bg-[var(--postilla-accent)] px-4 py-2 text-xs font-semibold text-[#1B1916] disabled:opacity-50"><Send className="h-3.5 w-3.5"/>{publishing ? 'Publishing…' : 'Publish article'}</button></div>
    </section>}
    {loading && articles.length === 0 && <p className="p-8 text-center text-sm text-[var(--postilla-secondary)]">Loading articles from your read and Search relays…</p>}
    {!loading && articles.length === 0 && <p className="p-8 text-center text-sm text-[var(--postilla-secondary)]">No NIP-23 articles found on the configured relays.</p>}
    <div className="divide-y divide-[var(--postilla-border)]">
      {articles.map((article) => <article key={article.address} className="p-4">
        <button onClick={() => setSelected(article)} className="block w-full text-left">
          <h2 className="text-lg font-semibold">{article.title}</h2>
          {article.summary && <p className="mt-1 text-sm text-[var(--postilla-secondary)]">{article.summary}</p>}
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--postilla-secondary)]"><span>{new Date(article.publishedAt * 1000).toLocaleDateString()}</span>{article.topics.map((topic) => <span key={topic}>#{topic}</span>)}</div>
        </button>
        <div className="mt-2 flex justify-end"><a href={`https://njump.me/${article.event.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--postilla-secondary)]">Open event <ExternalLink className="h-3 w-3"/></a></div>
      </article>)}
    </div>
    {selected && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label={selected.title}>
      <article className="mx-auto max-w-3xl rounded-2xl border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-5 sm:p-8">
        <div className="mb-4 flex items-start justify-between gap-3"><h2 className="text-2xl font-bold">{selected.title}</h2><button onClick={() => setSelected(null)} className="rounded-lg border border-[var(--postilla-border)] px-3 py-1 text-xs">Close</button></div>
        {selected.summary && <p className="mb-5 text-[var(--postilla-secondary)]">{selected.summary}</p>}
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7">{selected.content}</pre>
        <p className="mt-6 text-xs text-[var(--postilla-secondary)]">Author {selected.event.pubkey.slice(0, 12)}… · {new Date(selected.publishedAt * 1000).toLocaleString()}</p>
      </article>
    </div>}
  </div>
}
