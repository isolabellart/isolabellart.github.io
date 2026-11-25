import { create } from 'zustand'
import {
  DEFAULT_BLOSSOM_SERVERS,
  DEFAULT_NOTE_POW_BITS,
  DEFAULT_REACTION_POW_BITS,
  DEFAULT_RELAYS,
  type RelayEntry,
} from '../constants'
import { sanitizeBlossomUrl, sanitizeRelayUrl } from '../sanitize'

const STORAGE_KEY = 'postilla_web_settings_v1'

export interface SettingsState {
  relays: RelayEntry[]
  blossomServers: string[]
  dmRelays: string[]
  searchRelays: string[]
  language: 'en' | 'it'
  encryptedNwc: string | null
  notePowEnabled: boolean
  notePowBits: number
  reactionPowEnabled: boolean
  reactionPowBits: number
  mutedPubkeys: string[]
  mutedHashtags: string[]
  dmAutoLoadMedia: boolean
  clientTagEnabled: boolean
  spamFilterEnabled: boolean
  hideRepliesInExplore: boolean
  requirePowInExplore: boolean
  nwcUri: string

  addRelay: (url: string) => boolean
  removeRelay: (url: string) => void
  toggleRelayMode: (url: string, field: 'read' | 'write') => void
  resetRelays: () => void
  setRelays: (relays: RelayEntry[]) => void

  addBlossomServer: (url: string) => boolean
  removeBlossomServer: (url: string) => void
  setBlossomServers: (urls: string[]) => void
  addDmRelay: (url: string) => boolean
  removeDmRelay: (url: string) => void
  setDmRelays: (urls: string[]) => void
  addSearchRelay: (url: string) => boolean
  removeSearchRelay: (url: string) => void
  setSearchRelays: (urls: string[]) => void
  setLanguage: (language: 'en' | 'it') => void
  setEncryptedNwc: (ciphertext: string | null) => void

  setNotePowEnabled: (enabled: boolean) => void
  setNotePowBits: (bits: number) => void
  setReactionPowEnabled: (enabled: boolean) => void
  setReactionPowBits: (bits: number) => void

  mutePubkey: (pubkey: string) => void
  unmutePubkey: (pubkey: string) => void
  muteHashtag: (tag: string) => void
  unmuteHashtag: (tag: string) => void

  setDmAutoLoadMedia: (enabled: boolean) => void
  setClientTagEnabled: (enabled: boolean) => void
  setSpamFilterEnabled: (enabled: boolean) => void
  setHideRepliesInExplore: (enabled: boolean) => void
  setRequirePowInExplore: (enabled: boolean) => void
  setNwcUri: (uri: string) => void

  getReadRelays: () => string[]
  getWriteRelays: () => string[]
}

interface PersistedSettings {
  relays: RelayEntry[]
  blossomServers: string[]
  dmRelays: string[]
  searchRelays: string[]
  language: 'en' | 'it'
  encryptedNwc: string | null
  notePowEnabled: boolean
  notePowBits: number
  reactionPowEnabled: boolean
  reactionPowBits: number
  mutedPubkeys: string[]
  mutedHashtags: string[]
  dmAutoLoadMedia: boolean
  clientTagEnabled: boolean
  spamFilterEnabled: boolean
  hideRepliesInExplore: boolean
  requirePowInExplore: boolean
  // SECURITY: nwcUri is intentionally NEVER persisted to localStorage (session-only in memory).
}

function loadInitial(): PersistedSettings & { nwcUri: string } {
  const defaults: PersistedSettings & { nwcUri: string } = {
    relays: DEFAULT_RELAYS,
    blossomServers: DEFAULT_BLOSSOM_SERVERS,
    dmRelays: [],
    searchRelays: ['wss://relay.nostr.band'],
    language: 'en',
    encryptedNwc: null,
    notePowEnabled: true,
    notePowBits: DEFAULT_NOTE_POW_BITS,
    reactionPowEnabled: true,
    reactionPowBits: DEFAULT_REACTION_POW_BITS,
    mutedPubkeys: [],
    mutedHashtags: [],
    dmAutoLoadMedia: false,
    clientTagEnabled: true,
    spamFilterEnabled: true,
    hideRepliesInExplore: true,
    requirePowInExplore: false,
    nwcUri: '',
  }
  if (typeof localStorage === 'undefined') return defaults
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<PersistedSettings & { nwcUri?: string }>
    // Scrub any legacy nwcUri that may have been stored before session-only hardening
    const hadLegacyNwc = Boolean(parsed.nwcUri)
    let blossomServers = Array.isArray(parsed.blossomServers)
      ? parsed.blossomServers.filter((v): v is string => typeof v === 'string').map(sanitizeBlossomUrl).filter((v): v is string => Boolean(v))
      : DEFAULT_BLOSSOM_SERVERS

    // Migrate old untouched default pair away from private firewisp.blossom.rtard.de
    if (
      blossomServers.length === 2 &&
      blossomServers[0] === 'https://firewisp.blossom.rtard.de' &&
      blossomServers[1] === 'https://blossom.primal.net'
    ) {
      blossomServers = DEFAULT_BLOSSOM_SERVERS
    }

    const merged: PersistedSettings & { nwcUri: string } = {
      ...defaults,
      ...parsed,
      relays:
        Array.isArray(parsed.relays) && parsed.relays.length > 0
          ? parsed.relays
          : DEFAULT_RELAYS,
      blossomServers,
      dmRelays: Array.isArray(parsed.dmRelays) ? parsed.dmRelays.filter((v): v is string => typeof v === 'string').map(sanitizeRelayUrl).filter((v): v is string => Boolean(v)) : [],
      searchRelays: Array.isArray(parsed.searchRelays) ? parsed.searchRelays.filter((v): v is string => typeof v === 'string').map(sanitizeRelayUrl).filter((v): v is string => Boolean(v)) : defaults.searchRelays,
      language: parsed.language === 'it' ? 'it' : 'en',
      encryptedNwc: typeof parsed.encryptedNwc === 'string' ? parsed.encryptedNwc : null,
      nwcUri: '',
    }
    if (hadLegacyNwc) {
      const { nwcUri: _drop, ...cleanSnap } = merged
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanSnap))
    }
    return merged
  } catch {
    return defaults
  }
}

function persist(state: SettingsState) {
  if (typeof localStorage === 'undefined') return
  const snap: PersistedSettings = {
    relays: state.relays,
    blossomServers: state.blossomServers,
    dmRelays: state.dmRelays,
    searchRelays: state.searchRelays,
    language: state.language,
    encryptedNwc: state.encryptedNwc,
    notePowEnabled: state.notePowEnabled,
    notePowBits: state.notePowBits,
    reactionPowEnabled: state.reactionPowEnabled,
    reactionPowBits: state.reactionPowBits,
    mutedPubkeys: state.mutedPubkeys,
    mutedHashtags: state.mutedHashtags,
    dmAutoLoadMedia: state.dmAutoLoadMedia,
    clientTagEnabled: state.clientTagEnabled,
    spamFilterEnabled: state.spamFilterEnabled,
    hideRepliesInExplore: state.hideRepliesInExplore,
    requirePowInExplore: state.requirePowInExplore,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap))
  } catch {
    // ignore quota errors
  }
}

const initial = loadInitial()

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initial,

  addRelay: (rawUrl) => {
    const url = sanitizeRelayUrl(rawUrl)
    if (!url) return false
    const existing = get().relays
    if (existing.some((r) => r.url === url)) return false
    set({ relays: [...existing, { url, read: true, write: true }] })
    persist(get())
    return true
  },

  removeRelay: (url) => {
    set((s) => ({ relays: s.relays.filter((r) => r.url !== url) }))
    persist(get())
  },

  toggleRelayMode: (url, field) => {
    set((s) => ({
      relays: s.relays.map((r) => (r.url === url ? { ...r, [field]: !r[field] } : r)),
    }))
    persist(get())
  },

  resetRelays: () => {
    set({ relays: DEFAULT_RELAYS })
    persist(get())
  },
  setRelays: (relays) => {
    const clean = relays.map((r) => ({ url: sanitizeRelayUrl(r.url), read: Boolean(r.read), write: Boolean(r.write) }))
      .filter((r): r is { url: string; read: boolean; write: boolean } => Boolean(r.url))
    set({ relays: clean }); persist(get())
  }, 

  addBlossomServer: (rawUrl) => {
    const url = sanitizeBlossomUrl(rawUrl)
    if (!url) return false
    const existing = get().blossomServers
    if (existing.includes(url)) return false
    set({ blossomServers: [url, ...existing] })
    persist(get())
    return true
  },

  removeBlossomServer: (url) => {
    set((s) => ({ blossomServers: s.blossomServers.filter((u) => u !== url) }))
    persist(get())
  },
  setBlossomServers: (urls) => {
    const clean = [...new Set(urls.map(sanitizeBlossomUrl).filter((v): v is string => Boolean(v)))]
    set({ blossomServers: clean }); persist(get())
  },
  addDmRelay: (rawUrl) => {
    const url = sanitizeRelayUrl(rawUrl)
    if (!url || get().dmRelays.includes(url)) return false
    set({ dmRelays: [...get().dmRelays, url] }); persist(get()); return true
  },
  removeDmRelay: (url) => { set((s) => ({ dmRelays: s.dmRelays.filter((v) => v !== url) })); persist(get()) },
  setDmRelays: (urls) => {
    const clean = [...new Set(urls.map(sanitizeRelayUrl).filter((v): v is string => Boolean(v)))].slice(0, 10)
    set({ dmRelays: clean }); persist(get())
  },
  addSearchRelay: (rawUrl) => {
    const url = sanitizeRelayUrl(rawUrl)
    if (!url || get().searchRelays.includes(url)) return false
    set({ searchRelays: [...get().searchRelays, url] }); persist(get()); return true
  },
  removeSearchRelay: (url) => { set((s) => ({ searchRelays: s.searchRelays.filter((v) => v !== url) })); persist(get()) },
  setSearchRelays: (urls) => {
    const clean = [...new Set(urls.map(sanitizeRelayUrl).filter((v): v is string => Boolean(v)))]
    set({ searchRelays: clean }); persist(get())
  },
  setLanguage: (language) => { set({ language }); persist(get()) },
  setEncryptedNwc: (encryptedNwc) => { set({ encryptedNwc }); persist(get()) }, 

  setNotePowEnabled: (notePowEnabled) => {
    set({ notePowEnabled })
    persist(get())
  },
  setNotePowBits: (bits) => {
    set({ notePowBits: Math.min(24, Math.max(8, Math.round(bits))) })
    persist(get())
  },
  setReactionPowEnabled: (reactionPowEnabled) => {
    set({ reactionPowEnabled })
    persist(get())
  },
  setReactionPowBits: (bits) => {
    set({ reactionPowBits: Math.min(24, Math.max(8, Math.round(bits))) })
    persist(get())
  },

  mutePubkey: (pubkey) => {
    const clean = pubkey.toLowerCase()
    set((s) => ({
      mutedPubkeys: s.mutedPubkeys.includes(clean)
        ? s.mutedPubkeys
        : [...s.mutedPubkeys, clean],
    }))
    persist(get())
  },
  unmutePubkey: (pubkey) => {
    const clean = pubkey.toLowerCase()
    set((s) => ({ mutedPubkeys: s.mutedPubkeys.filter((p) => p !== clean) }))
    persist(get())
  },

  muteHashtag: (tag) => {
    const clean = tag.trim().toLowerCase().replace(/^#/, '')
    if (!clean) return
    set((s) => ({
      mutedHashtags: s.mutedHashtags.includes(clean)
        ? s.mutedHashtags
        : [...s.mutedHashtags, clean],
    }))
    persist(get())
  },
  unmuteHashtag: (tag) => {
    const clean = tag.trim().toLowerCase().replace(/^#/, '')
    set((s) => ({ mutedHashtags: s.mutedHashtags.filter((t) => t !== clean) }))
    persist(get())
  },

  setDmAutoLoadMedia: (dmAutoLoadMedia) => {
    set({ dmAutoLoadMedia })
    persist(get())
  },
  setClientTagEnabled: (clientTagEnabled) => {
    set({ clientTagEnabled })
    persist(get())
  },
  setSpamFilterEnabled: (spamFilterEnabled) => {
    set({ spamFilterEnabled })
    persist(get())
  },
  setHideRepliesInExplore: (hideRepliesInExplore) => {
    set({ hideRepliesInExplore })
    persist(get())
  },
  setRequirePowInExplore: (requirePowInExplore) => {
    set({ requirePowInExplore })
    persist(get())
  },
  setNwcUri: (nwcUri) => {
    // Session-only in memory — intentionally never written to localStorage.
    set({ nwcUri: nwcUri.trim() })
  },

  getReadRelays: () => get().relays.filter((r) => r.read).map((r) => r.url),
  getWriteRelays: () => get().relays.filter((r) => r.write).map((r) => r.url),
}))
