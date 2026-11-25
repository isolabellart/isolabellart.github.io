import { describe, expect, it } from 'vitest'
import type { Event } from 'nostr-tools/pure'
import { latestMarketplaceListings, uniqueMarketplaceInterestAuthors } from './marketplace'

const event = (overrides: Partial<Event>): Event => ({
  id: 'a'.repeat(64),
  pubkey: 'b'.repeat(64),
  created_at: 100,
  kind: 30402,
  tags: [['d', 'listing'], ['title', 'Test listing']],
  content: 'A listing',
  sig: 'c'.repeat(128),
  ...overrides,
})

describe('Marketplace addressable events', () => {
  it('removes an addressable listing only when the deletion author owns its coordinate', () => {
    const listing = event({})
    const coordinate = `30402:${listing.pubkey}:listing`
    const foreignDeletion = event({ id: 'd'.repeat(64), pubkey: 'e'.repeat(64), kind: 5, tags: [['a', coordinate]] })
    const ownedDeletion = event({ id: 'f'.repeat(64), kind: 5, tags: [['a', coordinate]] })
    expect(latestMarketplaceListings([listing, foreignDeletion])).toHaveLength(1)
    expect(latestMarketplaceListings([listing, ownedDeletion])).toHaveLength(0)
  })

  it('counts unique authors and omits reactions whose IDs were deleted', () => {
    const address = `30402:${'b'.repeat(64)}:listing`
    const first = event({ id: '1'.repeat(64), pubkey: 'a'.repeat(64), kind: 7, tags: [['a', address]] })
    const duplicate = event({ id: '2'.repeat(64), pubkey: 'a'.repeat(64), kind: 7, tags: [['a', address]] })
    const second = event({ id: '3'.repeat(64), pubkey: 'c'.repeat(64), kind: 7, tags: [['a', address]] })
    expect(uniqueMarketplaceInterestAuthors([first, duplicate, second], address)).toEqual(['a'.repeat(64), 'c'.repeat(64)])
    expect(uniqueMarketplaceInterestAuthors([first, duplicate, second], address, new Set([first.id, duplicate.id]))).toEqual(['c'.repeat(64)])
  })
})
