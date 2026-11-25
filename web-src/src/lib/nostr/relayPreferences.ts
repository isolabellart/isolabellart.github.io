import type { EventTemplate } from 'nostr-tools/pure'
import type { RelayEntry } from '../constants'
import { sanitizeBlossomUrl, sanitizeRelayUrl } from '../sanitize'

export interface RelayPreferenceInput {
  relays: RelayEntry[]
  dmRelays: string[]
  blossomServers: string[]
  searchRelays: string[]
}

function cleanUrls(values: string[], sanitize: (value: string) => string | null): string[] {
  return [...new Set(values.map(sanitize).filter((value): value is string => Boolean(value)))]
}

export function createRelayPreferenceTemplates(input: RelayPreferenceInput): EventTemplate[] {
  const readWrite = cleanUrls(input.relays.filter((r) => r.read && r.write).map((r) => r.url), sanitizeRelayUrl)
  const readOnly = cleanUrls(input.relays.filter((r) => r.read && !r.write).map((r) => r.url), sanitizeRelayUrl)
  const writeOnly = cleanUrls(input.relays.filter((r) => r.write && !r.read).map((r) => r.url), sanitizeRelayUrl)
  const dm = cleanUrls(input.dmRelays, sanitizeRelayUrl).slice(0, 10)
  const search = cleanUrls(input.searchRelays, sanitizeRelayUrl)
  const blossom = cleanUrls(input.blossomServers, sanitizeBlossomUrl)
  const now = Math.floor(Date.now() / 1000)

  const relayTags: string[][] = [
    ...readWrite.map((url) => ['r', url]),
    ...readOnly.map((url) => ['r', url, 'read']),
    ...writeOnly.map((url) => ['r', url, 'write']),
  ]
  return [
    { kind: 10002, created_at: now, tags: relayTags, content: '' },
    { kind: 10050, created_at: now, tags: dm.map((url) => ['relay', url]), content: '' },
    { kind: 10063, created_at: now, tags: blossom.map((url) => ['server', url]), content: '' },
    { kind: 10007, created_at: now, tags: search.map((url) => ['relay', url]), content: '' },
  ]
}
