import type { Event } from 'nostr-tools/pure'

export const NIP71_VIDEO_KINDS = [21,22,34235,34236] as const
export type Nip71Video = {
  event: Event
  address: string
  title: string
  url: string
  mimeType?: string
  dimension?: string
  thumbnail?: string
  duration?: number
  hash?: string
  thumbhash?: string
  blurhash?: string
  fallbacks: string[]
  vertical: boolean
}

export function isNip71VideoKind(kind:number):boolean {
  return (NIP71_VIDEO_KINDS as readonly number[]).includes(kind)
}

export function parseNip71Video(event:Event):Nip71Video|null {
  if(!isNip71VideoKind(event.kind))return null
  const media:{url?:string;mimeType?:string;dimension?:string;thumbnail?:string;duration?:number;hash?:string;thumbhash?:string;blurhash?:string;fallbacks:string[]}={
    fallbacks:[]
  }
  for(const tag of event.tags.filter(t=>t[0]==='imeta')){
    for(const part of tag.slice(1)){
      const index=part.indexOf(' ')
      if(index<1)continue
      const key=part.slice(0,index)
      const value=part.slice(index+1).trim()
      if(!value)continue
      if(key==='url')media.url ||= value
      else if(key==='m')media.mimeType ||= value
      else if(key==='dim')media.dimension ||= value
      else if(key==='image')media.thumbnail ||= value
      else if(key==='duration')media.duration ||= Number(value)
      else if(key==='x')media.hash ||= value
      else if(key==='thumbhash')media.thumbhash ||= value
      else if(key==='blurhash')media.blurhash ||= value
      else if(key==='fallback')media.fallbacks.push(value)
    }
  }
  if(!media.url){
    const match=event.content.match(/https:\/\/[^\s<>"']+\.(?:mp4|webm|mov|m4v|mkv)(?:\?[^\s<>"']*)?/i)
    media.url=match?.[0]
  }
  if(!media.url || !/^https:\/\//i.test(media.url))return null
  const d=event.tags.find(t=>t[0]==='d'&&t[1])?.[1]||''
  const width=media.dimension?.match(/^(\d+)x(\d+)$/i)
  const vertical=event.kind===22||event.kind===34236||(width?Number(width[2])>Number(width[1]):false)
  const title=event.tags.find(t=>t[0]==='title'&&t[1])?.[1]||'Nostr video'
  return {
    event,address:`${event.kind}:${event.pubkey}:${d}`,title,url:media.url,
    mimeType:media.mimeType,dimension:media.dimension,thumbnail:media.thumbnail,
    duration:Number.isFinite(media.duration)?media.duration:undefined,
    hash:media.hash,thumbhash:media.thumbhash,blurhash:media.blurhash,
    fallbacks:[...new Set(media.fallbacks)],vertical
  }
}

export function latestAddressableVideoRevisions(events:Event[]):Event[] {
  const unique=new Map<string,Event>()
  for(const ev of events)unique.set(ev.id,ev)
  const latest=new Map<string,Event>()
  for(const ev of unique.values()){
    if(ev.kind!==34235&&ev.kind!==34236)continue
    const d=ev.tags.find(t=>t[0]==='d'&&t[1])?.[1]
    if(!d)continue
    const key=`${ev.pubkey}:${ev.kind}:${d}`
    const current=latest.get(key)
    if(!current||ev.created_at>current.created_at||(ev.created_at===current.created_at&&ev.id>current.id))latest.set(key,ev)
  }
  return [...unique.values()].filter(ev=>{
    if(ev.kind!==34235&&ev.kind!==34236)return true
    const d=ev.tags.find(t=>t[0]==='d'&&t[1])?.[1]
    if(!d)return true
    return latest.get(`${ev.pubkey}:${ev.kind}:${d}`)?.id===ev.id
  })
}
