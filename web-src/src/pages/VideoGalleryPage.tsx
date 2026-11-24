import {useEffect,useState} from 'react'
import type {Event} from 'nostr-tools/pure'
import {Film,RefreshCw,Play} from 'lucide-react'
import {useSettingsStore} from '../lib/store/useSettingsStore'
import {nostrPool} from '../lib/nostr/pool'
type VideoItem={event:Event;url:string;poster?:string;title:string;vertical:boolean}
function parse(e:Event):VideoItem|null{
 let url='',poster=''
 for(const t of e.tags){if(t[0]!=='imeta')continue;for(const part of t.slice(1)){const i=part.indexOf(' ');if(i<1)continue;const k=part.slice(0,i),v=part.slice(i+1);if(k==='url')url=v;if(k==='image'||k==='thumb')poster=v}}
 if(!url){const m=e.content.match(/https:\/\/[^\s]+\.(mp4|webm|mov|m4v)/i);url=m?.[0]||''}
 if(!url||!url.startsWith('https://'))return null
 return {event:e,url,poster:poster||undefined,title:e.tags.find(t=>t[0]==='title')?.[1]||'Nostr video',vertical:e.kind===22||e.kind===34236}
}
export function VideoGalleryPage(){
 const settings=useSettingsStore()
 const [items,setItems]=useState<VideoItem[]>([])
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 async function refresh(){
  setLoading(true);setError('')
  try{const events=await nostrPool.query(settings.getReadRelays(),{kinds:[21,22,34235,34236],limit:100},9000);setItems(events.map(parse).filter((x):x is VideoItem=>Boolean(x)))}
  catch(e){setError(e instanceof Error?e.message:String(e))}finally{setLoading(false)}
 }
 useEffect(()=>{void refresh()},[])
 return <div className="min-h-full">
  <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--postilla-border)] bg-[var(--postilla-bg)]/95 px-4 py-3 backdrop-blur"><div className="flex items-center gap-2"><Film className="h-5 w-5 text-[var(--postilla-accent)]"/><h1 className="font-bold">Video Gallery</h1><span className="text-xs text-[var(--postilla-secondary)]">NIP-71</span></div><button onClick={()=>void refresh()} disabled={loading} className="rounded-lg border border-[var(--postilla-border)] p-2"><RefreshCw className="h-4 w-4"/></button></header>
  {error&&<p className="m-3 rounded-lg bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
  {loading&&items.length===0&&<p className="p-8 text-center text-sm text-[var(--postilla-secondary)]">Searching NIP-71 events…</p>}
  {!loading&&items.length===0&&<p className="p-8 text-center text-sm text-[var(--postilla-secondary)]">No NIP-71 videos found on your read relays.</p>}
  <div className="grid gap-4 p-3 sm:grid-cols-2">{items.map(v=><article key={v.event.id} className="overflow-hidden rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)]">
   <div className={v.vertical?'mx-auto max-w-xs':''}><video src={v.url} poster={v.poster} controls playsInline preload="metadata" className="max-h-[520px] w-full bg-black object-contain"/></div>
   <div className="space-y-2 p-3"><h2 className="font-semibold">{v.title}</h2><div className="flex justify-between text-[11px] text-[var(--postilla-secondary)]"><span>Kind {v.event.kind} · {v.event.pubkey.slice(0,10)}…</span><a href={'https://njump.me/'+v.event.id} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">Open event <Play className="h-3 w-3"/></a></div></div>
  </article>)}</div>
  <p className="px-4 pb-6 text-xs text-[var(--postilla-secondary)]">This first preview renders direct HTTPS media from kind 21/22 and 34235/34236. Blossom URI resolution, full addressable revision handling and video publishing still need additional work.</p>
 </div>
}
