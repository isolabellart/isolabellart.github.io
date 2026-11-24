import {useEffect,useMemo,useState} from 'react'
import type {Event} from 'nostr-tools/pure'
import {Search,Plus,RefreshCw,Bookmark,ExternalLink,Store} from 'lucide-react'
import {useAuthStore} from '../lib/store/useAuthStore'
import {useSettingsStore} from '../lib/store/useSettingsStore'
import {useNostrStore} from '../lib/store/useNostrStore'
import {nostrPool} from '../lib/nostr/pool'

type Listing={event:Event;d:string;title:string;description:string;price:string;currency:string;image?:string;category:string}
const tag=(e:Event,n:string)=>e.tags.find(t=>t[0]===n)?.[1]||''
function toListing(e:Event):Listing{
 const p=e.tags.find(t=>t[0]==='price')
 return {event:e,d:tag(e,'d'),title:tag(e,'title')||'Untitled listing',description:tag(e,'summary')||e.content,price:p?.[1]||'',currency:p?.[2]||'SATS',image:tag(e,'image')||undefined,category:tag(e,'t')||'Other'}
}
export function MarketplacePage(){
 const signer=useAuthStore(s=>s.signer)
 const settings=useSettingsStore()
 const bookmarks=useNostrStore(s=>s.bookmarks)
 const toggleBookmark=useNostrStore(s=>s.toggleBookmark)
 const [listings,setListings]=useState<Listing[]>([])
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [query,setQuery]=useState('')
 const [show,setShow]=useState(false)
 const [title,setTitle]=useState('')
 const [description,setDescription]=useState('')
 const [price,setPrice]=useState('')
 const [currency,setCurrency]=useState('SATS')
 const [category,setCategory]=useState('')
 const [image,setImage]=useState('')
 const [publishing,setPublishing]=useState(false)
 async function refresh(){
  setLoading(true);setError('')
  try{
   const relays=settings.getReadRelays()
   if(!relays.length)throw new Error('Add at least one read relay in Settings.')
   const events=await nostrPool.query(relays,{kinds:[30402],limit:100},9000)
   const latest=new Map<string,Event>()
   for(const e of events){const d=tag(e,'d');if(!d)continue;const k=e.pubkey+':'+d;const old=latest.get(k);if(!old||old.created_at<e.created_at)latest.set(k,e)}
   setListings(Array.from(latest.values()).map(toListing).sort((a,b)=>b.event.created_at-a.event.created_at))
  }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setLoading(false)}
 }
 useEffect(()=>{void refresh()},[])
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return q?listings.filter(l=>(l.title+' '+l.description+' '+l.category).toLowerCase().includes(q)):listings},[listings,query])
 async function publish(){
  if(!signer?.canSign){useAuthStore.getState().openAuthModal();return}
  if(!title.trim()||!description.trim()){setError('Title and description are required.');return}
  setPublishing(true);setError('')
  try{
   const d=crypto.randomUUID()
   const tags=[['d',d],['title',title.trim()],['summary',description.trim()],['published_at',String(Math.floor(Date.now()/1000))],['price',price.trim()||'0',currency],['t',category.trim()||'other'],['client','Postilla']]
   if(image.trim())tags.push(['image',image.trim()])
   const ev=await signer.signEvent({kind:30402,created_at:Math.floor(Date.now()/1000),tags,content:description.trim()})
   const results=await nostrPool.publish(settings.getWriteRelays(),ev)
   if(!results.some(r=>r.ok))throw new Error('No relay confirmed the listing.')
   setShow(false);setTitle('');setDescription('');setPrice('');setImage('');setCategory('');await refresh()
  }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setPublishing(false)}
 }
 return <div className="min-h-full">
  <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--postilla-border)] bg-[var(--postilla-bg)]/95 px-4 py-3 backdrop-blur">
   <div className="flex items-center gap-2"><Store className="h-5 w-5 text-[var(--postilla-accent)]"/><h1 className="font-bold">Marketplace</h1><span className="text-xs text-[var(--postilla-secondary)]">NIP-99</span></div>
   <div className="flex gap-2"><button onClick={()=>void refresh()} disabled={loading} className="rounded-lg border border-[var(--postilla-border)] p-2"><RefreshCw className="h-4 w-4"/></button><button onClick={()=>setShow(!show)} className="inline-flex items-center gap-1 rounded-lg bg-[var(--postilla-accent)] px-3 py-2 text-xs font-semibold text-[#1B1916]"><Plus className="h-4 w-4"/>New listing</button></div>
  </header>
  <div className="border-b border-[var(--postilla-border)] p-3"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--postilla-secondary)]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search listings" className="w-full rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)] py-2 pl-9 pr-3 text-sm outline-none"/></div></div>
  {error&&<div className="m-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}
  {show&&<section className="m-3 space-y-3 rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)] p-4">
   <h2 className="font-semibold">Publish a NIP-99 listing</h2>
   <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/>
   <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description" rows={4} className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/>
   <div className="grid grid-cols-2 gap-2"><input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Price" className="rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/><select value={currency} onChange={e=>setCurrency(e.target.value)} className="rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"><option>SATS</option><option>EUR</option><option>USD</option><option>BTC</option></select></div>
   <input value={category} onChange={e=>setCategory(e.target.value)} placeholder="Category tag" className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/>
   <input value={image} onChange={e=>setImage(e.target.value)} placeholder="HTTPS image URL (optional)" className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/>
   <p className="text-xs text-[var(--postilla-secondary)]">Initial staging: basic kind 30402 browsing and publishing. Android parity for interest counters, wishlist, sold/withdrawal handling and comments is not yet complete.</p>
   <div className="flex justify-end gap-2"><button onClick={()=>setShow(false)} className="rounded-lg px-3 py-2 text-xs">Cancel</button><button onClick={()=>void publish()} disabled={publishing} className="rounded-lg bg-[var(--postilla-accent)] px-3 py-2 text-xs font-semibold text-[#1B1916] disabled:opacity-50">{publishing?'Publishing…':'Publish'}</button></div>
  </section>}
  {loading&&listings.length===0&&<p className="p-8 text-center text-sm text-[var(--postilla-secondary)]">Loading listings…</p>}
  {!loading&&filtered.length===0&&<p className="p-8 text-center text-sm text-[var(--postilla-secondary)]">No listings found on the selected relays.</p>}
  <div className="grid gap-3 p-3 sm:grid-cols-2">{filtered.map(l=><article key={l.event.id} className="overflow-hidden rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)]">
   {l.image&&<img src={l.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-44 w-full object-cover"/>}
   <div className="space-y-2 p-3"><div className="flex items-start justify-between gap-2"><h2 className="font-semibold">{l.title}</h2><button onClick={()=>void toggleBookmark(l.event.id)} title="Bookmark" className="rounded-lg p-1.5"><Bookmark className="h-4 w-4"/></button></div>
    <p className="line-clamp-3 whitespace-pre-wrap text-sm text-[var(--postilla-secondary)]">{l.description}</p>
    <div className="flex justify-between text-xs"><strong>{l.price?l.price+' '+l.currency:'Price on request'}</strong><span className="text-[var(--postilla-secondary)]">{l.category}</span></div>
    <div className="flex justify-between border-t border-[var(--postilla-border)] pt-2 text-[11px] text-[var(--postilla-secondary)]"><span>{l.event.pubkey.slice(0,10)}…</span><a href={'https://njump.me/'+l.event.id} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">Open on Nostr <ExternalLink className="h-3 w-3"/></a></div>
   </div>
  </article>)}</div>
 </div>
}
