export interface RelayEntry { url:string; read:boolean; write:boolean }
export const FIREWISP_RELAY='wss://relay.primal.net'
export const TRENDING_RELAY='wss://trending.relays.land'
export const CURATED_EXPLORE_RELAYS=['wss://nostr.wine','wss://relay.primal.net','wss://nos.lol','wss://nostr.mom']
export const DEFAULT_BLOSSOM_PRIMARY='https://blossom.nostr.build'
export const DEFAULT_BLOSSOM_FALLBACK='https://blossom.primal.net'
export const ANDROID_APP_URL='https://zapstore.dev/apps/com.isolabellart.darkwispenhanced'
export const ZAPSTORE_URL='https://zapstore.dev/apps/com.isolabellart.darkwispenhanced'
export const SOURCE_REPO_URL='https://github.com/isolabellart/postilla-android'
export const DEFAULT_RELAYS:RelayEntry[]=[
{url:'wss://relay.damus.io',read:true,write:true},
{url:'wss://relay.primal.net',read:true,write:true},
{url:'wss://nos.lol',read:true,write:true},
{url:'wss://nostr.mom',read:true,write:true},
{url:'wss://purplepag.es',read:true,write:false}]
export const DEFAULT_BLOSSOM_SERVERS=[DEFAULT_BLOSSOM_PRIMARY,DEFAULT_BLOSSOM_FALLBACK]
export const DEFAULT_NOTE_POW_BITS=16
export const DEFAULT_REACTION_POW_BITS=12
export const NIP49_MIN_LOG_N=12
export const NIP49_MAX_LOG_N=20
export const MAX_BLOSSOM_UPLOAD_BYTES=10*1024*1024
export const CLIENT_TAG_VALUE='Postilla'
