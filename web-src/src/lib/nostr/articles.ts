import type { Event } from 'nostr-tools/pure'

export interface NostrArticle {
  event: Event
  address: string
  title: string
  summary: string
  content: string
  publishedAt: number
  topics: string[]
}

export function parseNostrArticle(event: Event): NostrArticle | null {
  if (event.kind !== 30023) return null
  const d = event.tags.find((tag) => tag[0] === 'd' && tag[1])?.[1]
  if (!d) return null
  const title = event.tags.find((tag) => tag[0] === 'title' && tag[1])?.[1] || 'Untitled article'
  const summary = event.tags.find((tag) => tag[0] === 'summary' && tag[1])?.[1] || ''
  const publishedAt = Number(event.tags.find((tag) => tag[0] === 'published_at' && tag[1])?.[1]) || event.created_at
  const topics = [...new Set(event.tags.filter((tag) => tag[0] === 't' && tag[1]).map((tag) => tag[1]))]
  return {
    event,
    address: `30023:${event.pubkey}:${d}`,
    title,
    summary,
    content: event.content,
    publishedAt,
    topics,
  }
}

export function latestNostrArticles(events: Event[]): NostrArticle[] {
  const latest = new Map<string, NostrArticle>()
  for (const event of events) {
    const article = parseNostrArticle(event)
    if (!article) continue
    const current = latest.get(article.address)
    if (!current || article.event.created_at > current.event.created_at ||
      (article.event.created_at === current.event.created_at && article.event.id > current.event.id)) {
      latest.set(article.address, article)
    }
  }
  return [...latest.values()].sort((a, b) => b.publishedAt - a.publishedAt)
}
