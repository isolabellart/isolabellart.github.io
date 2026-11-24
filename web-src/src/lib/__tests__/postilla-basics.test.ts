import {describe,expect,it} from 'vitest'
import {generateSecretKey,getPublicKey} from 'nostr-tools/pure'
import {LocalKeySigner} from '../nostr/signer'
import {createGiftWrappedDm,unwrapGiftWrap} from '../nostr/nip17'
import {parseNoteContent,extractImetaMap,extractEventHashtags} from '../nostr/content'
import {sanitizeHttpUrl,sanitizeRelayUrl,isPublicHostname} from '../sanitize'
import {evaluateNoteSpam,isTopLevelNote} from '../nostr/spamFilter'
import {buildCandidateServers} from '../nostr/blossom'
import {latestMarketplaceListings,parseMarketplaceListing,MARKETPLACE_READ_RELAYS,MARKETPLACE_WRITE_RELAYS} from './marketplace'
import {latestAddressableVideoRevisions,parseNip71Video} from './nip71'

describe('Postilla browser client security and media foundations',()=>{
 it('rejects unsafe URLs and private network destinations',()=>{
  expect(sanitizeHttpUrl('javascript:alert(1)')).toBeNull()
  expect(sanitizeHttpUrl('data:text/html,boom')).toBeNull()
  expect(sanitizeRelayUrl('ws://relay.example')).toBeNull()
  expect(isPublicHostname('127.0.0.1')).toBe(false)
  expect(isPublicHostname('localhost')).toBe(false)
 })
 it('uses both default public Blossom upload servers',()=>{
  expect(buildCandidateServers([])).toEqual(['https://blossom.nostr.build','https://blossom.primal.net'])
 })
 it('parses NIP-92 alt metadata and hashtags',()=>{
  const event={content:'View https://media.example.test/pic.webp #Postilla',tags:[['t','nostr'],['imeta','url https://media.example.test/pic.webp','m image/webp','alt Studio image']]}
  const imeta=extractImetaMap(event.tags)
  expect(imeta.get('https://media.example.test/pic.webp')?.alt).toBe('Studio image')
  expect(parseNoteContent(event).media[0].alt).toBe('Studio image')
  expect(extractEventHashtags(event).sort()).toEqual(['nostr','postilla'])
 })
 it('keeps NIP-17 gift-wrapped DMs encrypted and authenticated',async()=>{
  const alice=new LocalKeySigner(generateSecretKey())
  const bob=new LocalKeySigner(generateSecretKey())
  const {recipientWrap}=await createGiftWrappedDm(alice,bob.pubkey,'Hello Postilla')
  const decoded=await unwrapGiftWrap(recipientWrap,bob)
  expect(decoded?.senderPubkey).toBe(alice.pubkey)
  expect(decoded?.content).toBe('Hello Postilla')
  expect(decoded?.sealVerified).toBe(true)
 })
 it('filters obvious scam notes and recognises top-level notes',()=>{
  expect(evaluateNoteSpam({id:'a'.repeat(64),pubkey:'b'.repeat(64),kind:1,content:'Claim your free bitcoin airdrop now https://t.me/scam',tags:[]}).isSpam).toBe(true)
  expect(isTopLevelNote({kind:1,tags:[]})).toBe(true)
  expect(isTopLevelNote({kind:1,tags:[['e','c'.repeat(64),'','reply']]})).toBe(false)
 })
})

describe('Marketplace NIP-99 readers',()=>{
 const listing=(overrides:Partial<{id:string;kind:number;pubkey:string;created_at:number;content:string;tags:string[][]}>={})=>({
  id:'1'.repeat(64),kind:30402,pubkey:'a'.repeat(64),created_at:10,content:'A handcrafted object',tags:[['d','unique-item'],['title','Handcrafted object'],['summary','A small description'],['price','120','EUR'],['stock','2'],['t','art'],['image','https://media.example.test/item.jpg']],...overrides
 })
 it('separates marketplace read and write relay destinations',()=>{
  expect(MARKETPLACE_READ_RELAYS).toContain('wss://relay.barattolo.store')
  expect(MARKETPLACE_READ_RELAYS).not.toEqual(MARKETPLACE_WRITE_RELAYS)
  expect(MARKETPLACE_WRITE_RELAYS).not.toContain('wss://relay.barattolo.store')
 })
 it('parses NIP-99 prices, images, categories, stock and stable coordinates',()=>{
  const parsed=parseMarketplaceListing(listing() as never)
  expect(parsed?.address).toBe(`30402:${'a'.repeat(64)}:unique-item`)
  expect(parsed?.price).toBe('120')
  expect(parsed?.currency).toBe('EUR')
  expect(parsed?.images).toEqual(['https://media.example.test/item.jpg'])
  expect(parsed?.categories).toEqual(['art'])
  expect(parsed?.stock).toBe(2)
 })
 it('keeps latest addressable revisions per author and d tag',()=>{
  const older=listing({id:'1'.repeat(64),created_at:10})
  const newer=listing({id:'2'.repeat(64),created_at:20,tags:[['d','unique-item'],['title','Updated title']]})
  const other=listing({id:'3'.repeat(64),pubkey:'b'.repeat(64),created_at:15})
  const result=latestMarketplaceListings([older,newer,other] as never[])
  expect(result).toHaveLength(2)
  expect(result.find(x=>x.event.pubkey==='a'.repeat(64))?.title).toBe('Updated title')
 })
 it('hides sold-out stock from availability rather than confusing unknown stock with zero',()=>{
  const sold=parseMarketplaceListing(listing({tags:[['d','unique-item'],['stock','0']]} as never) as never)
  const unknown=parseMarketplaceListing(listing({tags:[['d','other']]} as never) as never)
  expect(sold?.isSold).toBe(true)
  expect(unknown?.isSold).toBe(false)
 })
})

describe('NIP-71 video metadata and addressable revisions',()=>{
 const video=(id:string,created_at:number,d:string,kind=34235)=>({id,kind,pubkey:'d'.repeat(64),created_at,content:'',tags:[['d',d],['title','Studio film'],['published_at',String(created_at)],['imeta','url https://media.example.test/film.mp4','m video/mp4','dim 1080x1920','image https://media.example.test/poster.jpg','duration 45','fallback https://mirror.example.test/film.mp4']]})
 it('parses NIP-71 imeta details and portrait orientation',()=>{
  const parsed=parseNip71Video(video('a'.repeat(64),10,'clip') as never)
  expect(parsed?.url).toBe('https://media.example.test/film.mp4')
  expect(parsed?.vertical).toBe(true)
  expect(parsed?.thumbnail).toBe('https://media.example.test/poster.jpg')
  expect(parsed?.duration).toBe(45)
  expect(parsed?.fallbacks).toEqual(['https://mirror.example.test/film.mp4'])
 })
 it('keeps only the latest revision of addressable videos',()=>{
  const old=video('1'.repeat(64),10,'clip')
  const latest=video('2'.repeat(64),20,'clip')
  const other=video('3'.repeat(64),15,'other')
  expect(latestAddressableVideoRevisions([old,latest,other] as never[]).map(x=>x.id)).toEqual([latest.id,other.id])
 })
})
