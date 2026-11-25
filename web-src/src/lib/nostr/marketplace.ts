import type { Event } from 'nostr-tools/pure'

export const MARKETPLACE_READ_RELAYS = [
  'wss://relay.dwadziesciaj21.pl',
  'wss://nostr.einundzwanzig.space',
  'wss://espelho.girino.org',
  'wss://adre.su',
  'wss://nostr.mom',
  'wss://purplepag.es',
  'wss://relay.barattolo.store',
  'wss://relay.conduit.market',
  'wss://relay.ditto.pub',
  'wss://nos.lol',
  'wss://relay.nostr.net',
  'wss://relay.plebeian.market',
  'wss://relay.nostr.band',
] as const

export const MARKETPLACE_WRITE_RELAYS = [
  'wss://relay.dwadziesciaj21.pl',
  'wss://nostr.einundzwanzig.space',
  'wss://espelho.girino.org',
  'wss://adre.su',
  'wss://nostr.mom',
  'wss://purplepag.es',
  'wss://relay.conduit.market',
  'wss://relay.nostr.band',
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
] as const

export const MARKETPLACE_KINDS = [30402, 30018] as const
export const MARKETPLACE_WISHLIST_DTAG = 'postilla-marketplace-wishlist'

export type MarketplaceListing = {
  event: Event
  kind: number
  d: string
  address: string
  title: string
  summary: string
  description: string
  price: string
  currency: string
  frequency?: string
  images: string[]
  categories: string[]
  location: string
  status: string
  visibility: string
  stock: number | null
  format: 'digital' | 'physical'
  productType: 'simple' | 'variable' | 'variation'
  isSold: boolean
}

function firstTag(event: Event, name: string): string | undefined {
  return event.tags.find(tag => tag[0] === name && tag[1])?.[1]
}
function allTags(event: Event, name: string): string[] {
  return event.tags.filter(tag => tag[0] === name && tag[1]).map(tag => tag[1])
}
function jsonObject(event: Event): Record<string, unknown> | null {
  if (event.kind !== 30018 || !event.content.trimStart().startsWith('{')) return null
  try {
    const value = JSON.parse(event.content)
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  } catch { return null }
}
function stringValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    return stringValue(obj.url ?? obj.value ?? obj.amount ?? '')
  }
  return ''
}
function legacyString(event: Event, field: string): string {
  return stringValue(jsonObject(event)?.[field])
}
function listingStatus(event: Event, visibility: string, stock: number | null): string {
  const raw = (firstTag(event, 'status') || legacyString(event, 'status')).trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_')
  if (['sold','sold_out','out_of_stock'].includes(raw) || stock === 0) return 'sold'
  if (['withdrawn','deleted','cancelled','canceled','hidden'].includes(raw) || visibility === 'hidden') return raw || 'hidden'
  if (visibility === 'pre-order' || raw === 'pre_order') return 'pre-order'
  return raw || 'active'
}

export function parseMarketplaceListing(event: Event, viewerPubkey?: string): MarketplaceListing | null {
  if (!(MARKETPLACE_KINDS as readonly number[]).includes(event.kind)) return null
  const d = firstTag(event, 'd') || ''
  if (!d.trim()) return null
  const json = jsonObject(event)
  const visibilityRaw = (firstTag(event,'visibility') || legacyString(event,'visibility') || firstTag(event,'status') || legacyString(event,'status')).trim().toLowerCase().replaceAll('_','-')
  const visibility = ['on-sale','pre-order','hidden'].includes(visibilityRaw) ? visibilityRaw : 'on-sale'
  const owned = Boolean(viewerPubkey && event.pubkey.toLowerCase() === viewerPubkey.toLowerCase())
  if ((visibility === 'hidden' || visibilityRaw === 'hidden') && !owned) return null

  const priceTag = event.tags.find(tag => tag[0] === 'price' && tag[1])
  const legacyPrice = json?.price
  const priceAmount = priceTag?.[1] || (legacyPrice && typeof legacyPrice === 'object' ? stringValue((legacyPrice as Record<string,unknown>).amount) : stringValue(legacyPrice))
  const priceCurrency = priceTag?.[2] || legacyString(event,'currency') || (legacyPrice && typeof legacyPrice === 'object' ? stringValue((legacyPrice as Record<string,unknown>).currency) : '')
  const frequency = priceTag?.[3] || (legacyPrice && typeof legacyPrice === 'object' ? stringValue((legacyPrice as Record<string,unknown>).frequency) : '') || undefined

  const legacyImages = Array.isArray(json?.images) ? json!.images.map(stringValue).filter(Boolean) : []
  const images = Array.from(new Set([...allTags(event,'image'),...legacyImages,...[legacyString(event,'image')].filter(Boolean)]))
  const legacyCategories = Array.isArray(json?.categories) ? json!.categories.map(stringValue).filter(Boolean) : []
  const categories = Array.from(new Set([...allTags(event,'t'),...legacyCategories]))
  const stockRaw = firstTag(event,'stock') || legacyString(event,'quantity') || legacyString(event,'stock')
  const stock = stockRaw.trim() ? Number(stockRaw) : null
  const safeStock = stock !== null && Number.isSafeInteger(stock) && stock >= 0 ? stock : null
  const status = listingStatus(event,visibility,safeStock)
  const productTypeRaw = (firstTag(event,'type') || '').toLowerCase()
  const productType = ['simple','variable','variation'].includes(productTypeRaw) ? productTypeRaw as MarketplaceListing['productType'] : 'simple'
  const formatRaw = (event.tags.find(t=>t[0]==='type')?.[2] || legacyString(event,'format') || (event.kind===30018?'physical':'digital')).toLowerCase()
  const format = formatRaw === 'physical' ? 'physical' : 'digital'
  const summary = firstTag(event,'summary') || legacyString(event,'summary')
  const description = event.kind===30018 ? legacyString(event,'description') || summary || event.content : event.content || summary
  const title = firstTag(event,'title') || legacyString(event,'name') || legacyString(event,'title') ||
    summary || description.split('\n').map(x=>x.trim().replace(/^#+\s*/,'')).find(Boolean)?.slice(0,120) || 'Untitled listing'
  const address = `${event.kind}:${event.pubkey}:${d}`

  return {
    event,kind:event.kind,d,address,title,summary,description,
    price:priceAmount,currency:priceCurrency,frequency,
    images,categories,location:firstTag(event,'location') || legacyString(event,'location'),
    status,visibility,stock:safeStock,format,productType,isSold:status==='sold'
  }
}

export function latestMarketplaceListings(events: Event[], viewerPubkey?: string): MarketplaceListing[] {
  const withdrawn = new Set<string>()
  for (const deletion of events) {
    if (deletion.kind !== 5) continue
    for (const entry of deletion.tags.filter((t) => t[0] === 'a' && t[1])) {
      const parts = entry[1].split(':')
      if (parts.length >= 3 && parts[0] === '30402' && parts[1] === deletion.pubkey) {
        withdrawn.add(`30402:${parts[1]}:${parts.slice(2).join(':')}`)
      }
    }
  }
  const byAddress = new Map<string, Event>()
  for (const event of events) {
    const parsed = parseMarketplaceListing(event,viewerPubkey)
    if (!parsed || withdrawn.has(parsed.address)) continue
    const existing=byAddress.get(parsed.address)
    if(!existing || event.created_at>existing.created_at || (event.created_at===existing.created_at && event.id>existing.id)) byAddress.set(parsed.address,event)
  }
  return [...byAddress.values()]
    .map(event=>parseMarketplaceListing(event,viewerPubkey))
    .filter((item):item is MarketplaceListing=>Boolean(item))
    .sort((a,b)=>(b.event.created_at-a.event.created_at))
}

export function uniqueMarketplaceInterestAuthors(
  events: Event[],
  address: string,
  deletedEventIds: Set<string> = new Set(),
): string[] {
  const authors = new Set<string>()
  for (const event of events) {
    if (event.kind !== 7 || deletedEventIds.has(event.id)) continue
    if (!event.tags.some((tag) => tag[0] === 'a' && tag[1] === address)) continue
    authors.add(event.pubkey.toLowerCase())
  }
  return [...authors]
}
