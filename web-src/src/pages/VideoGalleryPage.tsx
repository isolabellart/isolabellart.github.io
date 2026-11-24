import {useEffect,useState} from 'react'
import {Film,RefreshCw,Play,Clock3} from 'lucide-react'
import {useSettingsStore} from '../lib/store/useSettingsStore'
import {nostrPool} from '../lib/nostr/pool'
import {latestAddressableVideoRevisions,NIP71_VIDEO_KINDS,parseNip71Video,type Nip71Video} from '../lib/nostr/nip71'

export function VideoGalleryPage(){
 const settings=useSettingsStore()
 const [items,setItems]=useState<Nip71Video[]>([])
 const [loading,setLoading]=useState(false),[error,setError]=useState('')
 async function refresh(){
  setLoading(true);setError('')
  try{
   const events=await nostrPool.query(settings.getReadRelays(),{kinds:[...NIP71_VIDEO_KINDS],limit:500},12000)
   setItems(latestAddressableVideoRevisions(events).map(parseNip71Video).filter((v):v is Nip71Video=>Boolean(v)))
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setLoading(false)}
 }
 useEffect(()=>{void refresh()},[])
 return <div className="min-h-full">
  <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--postilla-border)] bg-[var(--postilla-bg)]/95 px-4 py-3 backdrop-blur"><div className="flex items-center gap-2"><Film className="h-5 w-5 text-[var(--postilla-accent)]"/><h1 className="font-bold">Video Gallery</h1><span className="text-xs text-[var(--postilla-secondary)]">NIP-71</span></div><button onClick={()=>void refresh()} disabled={loading} className="rounded-lg border border-[var(--postilla-border)] p-2" title="Refresh"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/></button></header>
  {error&&<p className="m-3 rounded-lg bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
  {loading&&items.length===0&&<p className="p-8 text-center text-sm text-[var(--postilla-secondary)]">Searching NIP-71 videos…</p>}
  {!loading&&items.length===0&&<p className="p-8 text-center text-sm text-[var(--postilla-secondary)]">No NIP-71 videos found on your read relays.</p>}
  <div className="grid gap-4 p-3 sm:grid-cols-2">{items.map(video=><article key={video.address||video.event.id} className="overflow-hidden rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)]">
   <div className={video.vertical?'mx-auto max-w-xs':''}><video src={video.url} poster={video.thumbnail} controls playsInline preload="metadata" className="max-h-[560px] w-full bg-black object-contain"/></div>
   <div className="space-y-2 p-3"><h2 className="font-semibold">{video.title}</h2>{video.duration!==undefined&&<p className="flex items-center gap-1 text-xs text-[var(--postilla-secondary)]"><Clock3 className="h-3 w-3"/>{video.duration}s</p>}<div className="flex justify-between text-[11px] text-[var(--postilla-secondary)]"><span>Kind {video.event.kind} · {video.event.pubkey.slice(0,10)}…{video.dimension?' · '+video.dimension:''}</span><a href={`https://njump.me/${video.event.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">Open event <Play className="h-3 w-3"/></a></div>{video.fallbacks.length>0&&<p className="text-[11px] text-[var(--postilla-secondary)]">Alternate media sources: {video.fallbacks.length}</p>}</div>
  </article>)}</div>
  <p className="px-4 pb-6 text-xs text-[var(--postilla-secondary)]">Kinds 21, 22, 34235 and 34236 are read. Addressable video revisions are collapsed to the latest event. Blossom URL resolution and video publishing are still to be integrated.</p>
 </div>
}
