import { describe, expect, it } from 'vitest'
import { latestNostrArticles, parseNostrArticle } from './articles'
import type { Event } from 'nostr-tools/pure'

const article = (id: string, created_at: number, content: string): Event => ({
  id, pubkey: 'a'.repeat(64), created_at, kind: 30023,
  tags: [['d', 'essay'], ['title', 'A long-form note'], ['summary', 'Preview'], ['published_at', String(created_at)], ['t', 'nostr']],
  content, sig: 'f'.repeat(128),
})

describe('NIP-23 articles', () => {
  it('parses the d-coordinate and article metadata', () => {
    const parsed = parseNostrArticle(article('1'.repeat(64), 10, '# Hello'))
    expect(parsed?.address).toBe(`30023:${'a'.repeat(64)}:essay`)
    expect(parsed?.title).toBe('A long-form note')
    expect(parsed?.topics).toEqual(['nostr'])
  })
  it('keeps only the newest revision for each author and d tag', () => {
    const items = latestNostrArticles([
      article('1'.repeat(64), 10, 'old'),
      article('2'.repeat(64), 20, 'new'),
    ])
    expect(items).toHaveLength(1)
    expect(items[0].content).toBe('new')
  })
})
