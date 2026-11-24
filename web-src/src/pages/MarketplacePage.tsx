import {useEffect,useMemo,useState} from 'react'
import type {Event} from 'nostr-tools/pure'
import {Search,Plus,RefreshCw,Bookmark,ExternalLink,Store,MapPin,PackageCheck,CheckCircle2} from 'lucide-react'
import {useAuthStore} from '../lib/store/useAuthStore'
import {useSettingsStore} from '../lib/store/useSettingsStore'
import {useNostrStore} from '../lib/store/useNostrStore'
import {nostrPool} from '../lib/nostr/pool'
import {MARKETPLACE_KINDS,MARKETPLACE_READ_RELAYS,MARKETPLACE_WRITE_RELAYS,MARKETPLACE_WISHLIST_DTAG,latestMarketplaceListings,type MarketplaceListing} from '../lib/nostr/marketplace'

const tag=(event:Event,name:string)=>event.tags.find(t=>t[0]===name&&t[1])?.[1]
export function MarketplacePage(){
 const signer=useAuthStore(s=>s.signer),pubkey=useAuthStore(s=>s.pubkey)
 const follows=useNostrStore(s=>s.follows),settings=useSettingsStore()
 const [listings,setListings]=useState<MarketplaceListing[]>([])
 const [wishlist,setWishlist]=useState<Set<string>>(new Set())
 const [wishlistEvent,setWishlistEvent]=useState<Event|null>(null)
 const [loading,setLoading]=useState(false),[publishing,setPublishing]=useState(false)
 const [error,setError]=useState(''),[notice,setNotice]=useState('')
 const [query,setQuery]=useState(''),[categoryFilter,setCategoryFilter]=useState('all'),[locationFilter,setLocationFilter]=useState('all')
 const [scope,setScope]=useState<'all'|'following'|'mine'>('all'),[hideSold,setHideSold]=useState(true)
 const [showComposer,setShowComposer]=useState(false)
 const [title,setTitle]=useState(''),[summary,setSummary]=useState(''),[description,setDescription]=useState('')
 const [price,setPrice]=useState(''),[currency,setCurrency]=useState('EUR'),[stock,setStock]=useState('1')
 const [format,setFormat]=useState<'physical'|'digital'>('physical'),[visibility,setVisibility]=useState<'on-sale'|'pre-order'>('on-sale')
 const [location,setLocation]=useState(''),[categories,setCategories]=useState(''),[images,setImages]=useState('')

 async function loadWishlist(){
  if(!pubkey){setWishlist(new Set());setWishlistEvent(null);return}
  const relays=[...new Set([...settings.getReadRelays(),...MARKETPLACE_READ_RELAYS])]
  try{
   const events=await nostrPool.query(relays,{kinds:[30003],authors:[pubkey],limit:100},9000)
   const owned=events.filter(e=>tag(e,'d')===MARKETPLACE_WISHLIST_DTAG).sort((a,b)=>b.created_at-a.created_at)[0]
   setWishlistEvent(owned||null);setWishlist(new Set(owned?.tags.filter(t=>t[0]==='a'&&t[1]).map(t=>t[1])||[]))
  }catch{}
 }
 async function refresh(){
  setLoading(true);setError('')
  try{
   const relays=[...new Set([...settings.getReadRelays(),...MARKETPLACE_READ_RELAYS])]
   if(!relays.length)throw new Error('No Marketplace read relay is configured.')
   const events=await nostrPool.query(relays,{kinds:[...MARKETPLACE_KINDS],limit:1000},12000)
   setListings(latestMarketplaceListings(events,pubkey || undefined));await loadWishlist()
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setLoading(false)}
 }
 useEffect(()=>{void refresh()},[pubkey])
 const categoriesAvailable=useMemo(()=>Array.from(new Set(listings.flatMap(l=>l.categories))).sort(),[listings])
 const locationsAvailable=useMemo(()=>Array.from(new Set(listings.map(l=>l.location).filter(Boolean))).sort(),[listings])
 const filtered=useMemo(()=>listings.filter(l=>{
  const q=query.trim().toLowerCase()
  if(hideSold&&l.isSold)return false
  if(categoryFilter!=='all'&&!l.categories.some(c=>c.toLowerCase()===categoryFilter.toLowerCase()))return false
  if(locationFilter!=='all'&&l.location.toLowerCase()!==locationFilter.toLowerCase())return false
  if(scope==='mine'&&l.event.pubkey!==pubkey)return false
  if(scope==='following'&&l.event.pubkey!==pubkey&&!follows.includes(l.event.pubkey))return false
  if(q&&!([l.title,l.summary,l.description,l.location,l.categories.join(' '),l.event.pubkey].join(' ').toLowerCase().includes(q)))return false
  return true
 }),[listings,query,categoryFilter,locationFilter,scope,hideSold,pubkey,follows])

 async function publishToMarketplace(event:Event){
  const relays=[...new Set([...settings.getWriteRelays(),...MARKETPLACE_WRITE_RELAYS])]
  const outcomes=await nostrPool.publish(relays,event)
  if(!outcomes.some(result=>result.ok))throw new Error('No Marketplace relay confirmed this update.')
 }
 async function publishListing(){
  if(!signer?.canSign){useAuthStore.getState().openAuthModal();return}
  if(!title.trim()||!description.trim()){setError('Title and description are required.');return}
  const count=stock.trim()===''?null:Number(stock)
  if(count!==null&&(!Number.isSafeInteger(count)||count<0)){setError('Stock must be a non-negative whole number.');return}
  setPublishing(true);setError('');setNotice('')
  try{
   const d=crypto.randomUUID(),now=String(Math.floor(Date.now()/1000))
   const tags:string[][]=[['d',d],['title',title.trim()],['summary',summary.trim()||description.trim()],['published_at',now],['status','active'],['type','simple',format],['visibility',visibility],['client','Postilla']]
   if(count!==null)tags.push(['stock',String(count)])
   if(location.trim())tags.push(['location',location.trim()])
   if(price.trim())tags.push(['price',price.trim(),currency])
   categories.split(/[,#\n]/).map(s=>s.trim().replace(/^#/,'').toLowerCase()).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).forEach(c=>tags.push(['t',c]))
   images.split(/\n/).map(s=>s.trim()).filter(s=>/^https:\/\//i.test(s)).forEach(url=>tags.push(['image',url]))
   const event=await signer.signEvent({kind:30402,created_at:Math.floor(Date.now()/1000),tags,content:description.trim()})
   await publishToMarketplace(event);setNotice('The listing was confirmed by at least one Marketplace relay.')
   setShowComposer(false);setTitle('');setSummary('');setDescription('');setPrice('');setStock('1');setLocation('');setCategories('');setImages('')
   await refresh()
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setPublishing(false)}
 }
 async function toggleWishlist(listing:MarketplaceListing){
  if(!signer?.canSign||!pubkey){useAuthStore.getState().openAuthModal();return}
  const next=new Set(wishlist)
  if(next.has(listing.address))next.delete(listing.address);else next.add(listing.address)
  setWishlist(next);setError('');setNotice('')
  try{
   const oldTags=wishlistEvent?.tags.filter(t=>!['d','title','a','client'].includes(t[0]))||[]
   const tags:string[][]=[['d',MARKETPLACE_WISHLIST_DTAG],['title','Marketplace Wishlist'],...Array.from(next).sort().map(address=>['a',address]),...oldTags,['client','Postilla']]
   const event=await signer.signEvent({kind:30003,created_at:Math.floor(Date.now()/1000),tags,content:wishlistEvent?.content||''})
   const outcomes=await nostrPool.publish(settings.getWriteRelays(),event)
   if(!outcomes.some(result=>result.ok))throw new Error('No personal write relay confirmed the Wishlist update.')
   setWishlistEvent(event);setNotice(next.has(listing.address)?'Listing saved to your NIP-51 Wishlist.':'Listing removed from your NIP-51 Wishlist.')
  }catch(e){setWishlist(new Set(wishlist));setError(e instanceof Error?e.message:String(e));await loadWishlist()}
 }
 async function markSold(listing:MarketplaceListing){
  if(!signer?.canSign||listing.event.pubkey!==pubkey||listing.kind!==30402)return
  setPublishing(true);setError('')
  try{
   const keep=listing.event.tags.filter(t=>!['status','stock','published_at','client'].includes(t[0]))
   const tags=[...keep,['status','sold'],['stock','0'],['published_at',String(Math.floor(Date.now()/1000))],['client','Postilla']]
   const revised=await signer.signEvent({kind:30402,created_at:Math.floor(Date.now()/1000),tags,content:listing.event.content})
   await publishToMarketplace(revised);setNotice('Sold status was confirmed by a Marketplace relay.');await refresh()
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setPublishing(false)}
 }
 return <div className="min-h-full">
  <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--postilla-border)] bg-[var(--postilla-bg)]/95 px-4 py-3 backdrop-blur">
   <div className="flex items-center gap-2"><Store className="h-5 w-5 text-[var(--postilla-accent)]"/><h1 className="font-bold">Marketplace</h1><span className="text-xs text-[var(--postilla-secondary)]">NIP-99</span></div>
   <div className="flex gap-2"><button onClick={()=>void refresh()} disabled={loading} className="rounded-lg border border-[var(--postilla-border)] p-2" title="Refresh"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/></button><button onClick={()=>setShowComposer(v=>!v)} className="inline-flex items-center gap-1 rounded-lg bg-[var(--postilla-accent)] px-3 py-2 text-xs font-semibold text-[#1B1916]"><Plus className="h-4 w-4"/>New listing</button></div>
  </header>
  <div className="space-y-3 border-b border-[var(--postilla-border)] p-3">
   <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--postilla-secondary)]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search listings, sellers, descriptions" className="w-full rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--postilla-accent)]"/></div>
   <div className="flex flex-wrap gap-2">
    <select value={scope} onChange={e=>setScope(e.target.value as typeof scope)} className="rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-surface)] px-2 py-1.5 text-xs"><option value="all">All listings</option><option value="following">Following</option><option value="mine">My listings</option></select>
    <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="max-w-[45%] rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-surface)] px-2 py-1.5 text-xs"><option value="all">All categories</option>{categoriesAvailable.map(c=><option key={c}>{c}</option>)}</select>
    <select value={locationFilter} onChange={e=>setLocationFilter(e.target.value)} className="max-w-[45%] rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-surface)] px-2 py-1.5 text-xs"><option value="all">All locations</option>{locationsAvailable.map(c=><option key={c}>{c}</option>)}</select>
    <label className="ml-auto flex items-center gap-2 text-xs text-[var(--postilla-secondary)]"><input type="checkbox" checked={hideSold} onChange={e=>setHideSold(e.target.checked)}/>Hide sold out</label>
   </div>
   <div className="text-[11px] text-[var(--postilla-secondary)]">{filtered.length} listings · read from dedicated Marketplace relays and your configured relays</div>
  </div>
  {error&&<div className="m-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}
  {notice&&<div className="m-3 rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-surface)] p-3 text-xs text-[var(--postilla-text)]">{notice}</div>}
  {showComposer&&<section className="m-3 space-y-3 rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)] p-4">
   <h2 className="font-semibold">Publish a NIP-99 listing</h2>
   <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/>
   <input value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Short summary" className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/>
   <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description" rows={4} className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/>
   <div className="grid grid-cols-2 gap-2"><input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Price" className="rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/><select value={currency} onChange={e=>setCurrency(e.target.value)} className="rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm">{['EUR','USD','GBP','CHF','CAD','AUD','JPY','CNY','NZD','SEK','NOK','BTC','SATS'].map(v=><option key={v}>{v}</option>)}</select></div>
   <div className="grid grid-cols-2 gap-2"><input value={stock} onChange={e=>setStock(e.target.value)} inputMode="numeric" placeholder="Stock (blank = unknown)" className="rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/><select value={format} onChange={e=>setFormat(e.target.value as typeof format)} className="rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"><option value="physical">Physical</option><option value="digital">Digital</option></select></div>
   <select value={visibility} onChange={e=>setVisibility(e.target.value as typeof visibility)} className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"><option value="on-sale">On sale</option><option value="pre-order">Pre-order</option></select>
   <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Location (optional)" className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/>
   <input value={categories} onChange={e=>setCategories(e.target.value)} placeholder="Categories (comma separated)" className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/>
   <textarea value={images} onChange={e=>setImages(e.target.value)} placeholder="Image HTTPS URLs (one per line)" rows={2} className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-2 text-sm"/>
   <p className="text-xs text-[var(--postilla-secondary)]">The listing uses Android-aligned NIP-99 tags. Image URLs must already be uploaded; the full Blossom editor/upload flow is not yet integrated.</p>
   <div className="flex justify-end gap-2"><button onClick={()=>setShowComposer(false)} className="rounded-lg px-3 py-2 text-xs">Cancel</button><button onClick={()=>void publishListing()} disabled={publishing} className="rounded-lg bg-[var(--postilla-accent)] px-3 py-2 text-xs font-semibold text-[#1B1916] disabled:opacity-50">{publishing?'Publishing…':'Publish'}</button></div>
  </section>}
  {loading&&listings.length===0&&<p className="p-8 text-center text-sm text-[var(--postilla-secondary)]">Loading Marketplace listings…</p>}
  {!loading&&filtered.length===0&&<p className="p-8 text-center text-sm text-[var(--postilla-secondary)]">No listings found on the selected Marketplace relays.</p>}
  <div className="grid gap-3 p-3 sm:grid-cols-2">{filtered.map(listing=><article key={listing.address} className="overflow-hidden rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)]">
   {listing.images[0]&&<img src={listing.images[0]} alt={listing.title} loading="lazy" referrerPolicy="no-referrer" className="h-44 w-full object-cover"/>}
   <div className="space-y-2 p-3">
    <div className="flex items-start justify-between gap-2"><h2 className="font-semibold">{listing.title}</h2><button onClick={()=>void toggleWishlist(listing)} title={wishlist.has(listing.address)?'Remove from Wishlist':'Save to Wishlist'} className="rounded-lg p-1.5 hover:bg-[var(--postilla-inset)]"><Bookmark className={`h-4 w-4 ${wishlist.has(listing.address)?'fill-current text-[var(--postilla-accent)]':'text-[var(--postilla-secondary)]'}`}/></button></div>
    {(listing.summary||listing.description)&&<p className="line-clamp-3 whitespace-pre-wrap text-sm text-[var(--postilla-secondary)]">{listing.summary||listing.description}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><strong>{listing.price?listing.price+' '+listing.currency:'Price on request'}{listing.frequency?'/'+listing.frequency:''}</strong><span className="text-[var(--postilla-secondary)]">{listing.categories.join(' · ')||listing.format}</span></div>
    {listing.location&&<p className="flex items-center gap-1 text-xs text-[var(--postilla-secondary)]"><MapPin className="h-3 w-3"/>{listing.location}</p>}
    <div className="flex flex-wrap items-center gap-2 text-[11px]"><span className="rounded-full border border-[var(--postilla-border)] px-2 py-1">{listing.isSold?'Sold out':listing.status==='pre-order'?'Pre-order':listing.stock===null?'Availability unknown':listing.stock+' available'}</span><span className="text-[var(--postilla-secondary)]">{listing.format} · {listing.kind===30018?'NIP-15 legacy':'NIP-99'}</span></div>
    <div className="flex justify-between border-t border-[var(--postilla-border)] pt-2 text-[11px] text-[var(--postilla-secondary)]"><span>{listing.event.pubkey.slice(0,10)}…</span><div className="flex gap-3"><a href={`https://njump.me/${listing.event.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">Open <ExternalLink className="h-3 w-3"/></a>{listing.event.pubkey===pubkey&&listing.kind===30402&&!listing.isSold&&<button onClick={()=>void markSold(listing)} className="inline-flex items-center gap-1 text-[var(--postilla-accent)]"><PackageCheck className="h-3 w-3"/>Mark sold</button>}{listing.event.pubkey===pubkey&&listing.isSold&&<span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/>Updated</span>}</div></div>
   </div>
  </article>)}</div>
 </div>
}
