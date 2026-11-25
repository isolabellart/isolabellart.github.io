import { describe, expect, it } from 'vitest'
import { createRelayPreferenceTemplates } from './relayPreferences'

describe('Nostr relay preference events', () => {
  it('creates NIP-65 markers and the three separate service lists', () => {
    const events = createRelayPreferenceTemplates({
      relays: [
        { url: 'wss://both.example', read: true, write: true },
        { url: 'wss://read.example', read: true, write: false },
        { url: 'wss://write.example', read: false, write: true },
      ],
      dmRelays: ['wss://dm.example'],
      blossomServers: ['https://blossom.example'],
      searchRelays: ['wss://search.example'],
    })
    expect(events.map((e) => e.kind)).toEqual([10002, 10050, 10063, 10007])
    expect(events[0].tags).toEqual([
      ['r', 'wss://both.example'],
      ['r', 'wss://read.example', 'read'],
      ['r', 'wss://write.example', 'write'],
    ])
    expect(events[1].tags).toEqual([['relay', 'wss://dm.example']])
    expect(events[2].tags).toEqual([['server', 'https://blossom.example']])
    expect(events[3].tags).toEqual([['relay', 'wss://search.example']])
  })
})
