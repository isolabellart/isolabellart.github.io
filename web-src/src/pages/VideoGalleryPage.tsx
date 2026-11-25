import { useEffect, useState } from 'react'
import { Film, RefreshCw, Play, Clock3, UploadCloud, Loader2 } from 'lucide-react'
import { useAuthStore } from '../lib/store/useAuthStore'
import { useSettingsStore } from '../lib/store/useSettingsStore'
import { nostrPool } from '../lib/nostr/pool'
import { latestAddressableVideoRevisions, NIP71_VIDEO_KINDS, parseNip71Video, type Nip71Video } from '../lib/nostr/nip71'
import { uploadToBlossom, buildImetaTag } from '../lib/nostr/blossom'

export function VideoGalleryPage() {
  const signer = useAuthStore((s) => s.signer)
  const settings = useSettingsStore()
  const [items, setItems] = useState<Nip71Video[]>([])
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [alt, setAlt] = useState('')
  const [videoKind, setVideoKind] = useState<34235 | 34236>(34235)
  const [showUploader, setShowUploader] = useState(false)

  async function refresh() {
    setLoading(true); setError('')
    try {
      const relays = [...new Set([...settings.getReadRelays(), ...settings.searchRelays])]
      const events = await nostrPool.query(relays, { kinds: [...NIP71_VIDEO_KINDS], limit: 500 }, 12000)
      setItems(latestAddressableVideoRevisions(events).map(parseNip71Video).filter((v): v is Nip71Video => Boolean(v)))
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [settings.relays, settings.searchRelays])

  async function publishVideo() {
    if (!signer?.canSign) { useAuthStore.getState().openAuthModal(); return }
    if (!file || !title.trim()) { setError('Choose a video and enter a title.'); return }
    if (!file.type.startsWith('video/')) { setError('The selected file is not a video.'); return }
    setPublishing(true); setError(''); setNotice('')
    try {
      const uploaded = await uploadToBlossom(file, file.type, signer, settings.blossomServers)
      const now = Math.floor(Date.now() / 1000)
      const event = await signer.signEvent({
        kind: videoKind,
        created_at: now,
        tags: [
          ['d', crypto.randomUUID()],
          ['title', title.trim()],
          ['published_at', String(now)],
          buildImetaTag(uploaded, alt.trim() || title.trim()),
          ['client', 'Postilla'],
        ],
        content: description.trim(),
      })
      const results = await nostrPool.publish(settings.getWriteRelays(), event)
      const confirmed = results.filter((r) => r.ok).length
      if (!confirmed) throw new Error('The video was uploaded, but no configured Nostr write relay confirmed the NIP-71 event.')
      setNotice(`Video published. Relay confirmations: ${confirmed}/${results.length}. Media: ${uploaded.url}`)
      setFile(null); setTitle(''); setDescription(''); setAlt(''); setVideoKind(34235); setShowUploader(false)
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setPublishing(false) }
  }

  return <div className="min-h-full">
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--postilla-border)] bg-[var(--postilla-bg)]/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2"><Film className="h-5 w-5 text-[var(--postilla-accent)]"/><h1 className="font-bold">Video Gallery</h1><span className="text-xs text-[var(--postilla-secondary)]">NIP-71</span></div>
      <div className="flex gap-2">
        <button onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-[var(--postilla-border)] p-2" title="Refresh"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/></button>
        <button onClick={() => setShowUploader((v) => !v)} className="inline-flex items-center gap-1 rounded-lg bg-[var(--postilla-accent)] px-3 py-2 text-xs font-semibold text-[#1B1916]"><UploadCloud className="h-4 w-4"/>Upload</button>
      </div>
    </header>
    {error && <p role="alert" className="m-3 rounded-lg bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
    {notice && <p role="status" className="m-3 break-all rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-surface)] p-3 text-xs">{notice}</p>}
    {showUploader && <section className="m-3 space-y-3 rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)] p-4">
      <h2 className="font-semibold">Publish NIP-71 video</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Video title" className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={3} className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/>
      <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Accessible media description (alt)" className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/>
      <select value={videoKind} onChange={(e) => setVideoKind(Number(e.target.value) as 34235 | 34236)} className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"><option value={34235}>Horizontal / standard video (34235)</option><option value={34236}>Vertical video (34236)</option></select>
      <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-xs"/>
      <p className="text-xs text-[var(--postilla-secondary)]">The video is uploaded to your selected Blossom servers, then published as an addressable kind 34235 event with NIP-92 imeta metadata. Maximum upload size: 10 MB.</p>
      {file && <p className="text-xs text-[var(--postilla-secondary)]">{file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB</p>}
      <div className="flex justify-end"><button onClick={() => void publishVideo()} disabled={publishing} className="inline-flex items-center gap-2 rounded-lg bg-[var(--postilla-accent)] px-4 py-2 text-xs font-semibold text-[#1B1916] disabled:opacity-50">{publishing && <Loader2 className="h-3.5 w-3.5 animate-spin"/>}{publishing ? 'Uploading and publishing…' : 'Publish video'}</button></div>
    </section>}
    {loading && items.length === 0 && <p className="p-8 text-center text-sm text-[var(--postilla-secondary)]">Searching NIP-71 videos…</p>}
    {!loading && items.length === 0 && <p className="p-8 text-center text-sm text-[var(--postilla-secondary)]">No NIP-71 videos found on your read and Search relays.</p>}
    <div className="grid gap-4 p-3 sm:grid-cols-2">{items.map((video) => <article key={video.address || video.event.id} className="overflow-hidden rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)]">
      <div className={video.vertical ? 'mx-auto max-w-xs' : ''}><video src={video.url} poster={video.thumbnail} controls playsInline preload="metadata" className="max-h-[560px] w-full bg-black object-contain"/></div>
      <div className="space-y-2 p-3">
        <h2 className="font-semibold">{video.title}</h2>
        {video.duration !== undefined && <p className="flex items-center gap-1 text-xs text-[var(--postilla-secondary)]"><Clock3 className="h-3 w-3"/>{video.duration}s</p>}
        <div className="flex justify-between text-[11px] text-[var(--postilla-secondary)]"><span>Kind {video.event.kind} · {video.event.pubkey.slice(0, 10)}…{video.dimension ? ' · ' + video.dimension : ''}</span><a href={`https://njump.me/${video.event.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">Open event <Play className="h-3 w-3"/></a></div>
        {video.fallbacks.length > 0 && <p className="text-[11px] text-[var(--postilla-secondary)]">Alternate media sources: {video.fallbacks.length}</p>}
      </div>
    </article>)}</div>
  </div>
}
