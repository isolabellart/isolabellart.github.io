import type { Event } from 'nostr-tools/pure'
import { nostrPool, type PublishResult } from '../nostr/pool'
import type { FireWispSigner } from '../nostr/signer'

export const SPARK_BACKUP_KIND = 30078
const D_TAG_PREFIX = 'spark-wallet-backup'

export interface SparkRelayBackup {
  event: Event
  dTag: string
  walletId: string | null
  mnemonic: string
  createdAt: number
}

export interface SparkRelayStatus {
  relay: string
  hasBackup: boolean
}

export function normalizeSparkMnemonic(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function computeSparkWalletId(mnemonic: string): Promise<string> {
  const normalized = normalizeSparkMnemonic(mnemonic)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

export function sparkBackupDTag(walletId: string): string {
  return `${D_TAG_PREFIX}:${walletId}`
}

function getDTag(event: Event): string | null {
  return event.tags.find(tag => tag[0] === 'd' && tag[1])?.[1] ?? null
}

function isDeleted(event: Event): boolean {
  return !event.content.trim() || event.tags.some(tag => tag[0] === 'deleted' && tag[1] === 'true')
}

function isSparkBackup(event: Event): boolean {
  return getDTag(event)?.startsWith(D_TAG_PREFIX) === true
}

export async function createSparkBackupEvent(
  signer: FireWispSigner,
  mnemonic: string,
): Promise<Event> {
  if (!signer.canSign || !signer.canEncrypt) {
    throw new Error('The active Nostr signer must support signing and NIP-44 encryption to back up a Spark wallet.')
  }
  const normalized = normalizeSparkMnemonic(mnemonic)
  if (!normalized) throw new Error('The Spark recovery phrase is empty.')
  const walletId = await computeSparkWalletId(normalized)
  const encrypted = await signer.nip44Encrypt(signer.pubkey, normalized)
  return signer.signEvent({
    kind: SPARK_BACKUP_KIND,
    created_at: Math.floor(Date.now() / 1000),
    content: encrypted,
    tags: [
      ['d', sparkBackupDTag(walletId)],
      ['client', 'Postilla'],
      ['encryption', 'nip44'],
    ],
  })
}

export async function publishSparkBackup(
  signer: FireWispSigner,
  mnemonic: string,
  writeRelays: string[],
): Promise<PublishResult[]> {
  if (writeRelays.length === 0) throw new Error('No personal write relays are configured. Add a NIP-65 write relay in Settings first.')
  const event = await createSparkBackupEvent(signer, mnemonic)
  const results = await nostrPool.publish(writeRelays, event)
  if (!results.some(result => result.ok)) {
    throw new Error('No write relay confirmed the Spark backup. Check your relay connections and try again.')
  }
  return results
}

export async function findSparkRelayBackups(
  signer: FireWispSigner,
  readRelays: string[],
  writeRelays: string[],
): Promise<SparkRelayBackup[]> {
  if (!signer.canEncrypt) {
    throw new Error('The active Nostr signer does not support NIP-44 decryption.')
  }
  const relays = [...new Set([...readRelays, ...writeRelays])]
  if (relays.length === 0) throw new Error('No personal read/write relays are configured.')
  const events = await nostrPool.query(relays, {
    kinds: [SPARK_BACKUP_KIND],
    authors: [signer.pubkey],
  }, 7000)

  const newest = new Map<string, Event>()
  for (const event of events) {
    const dTag = getDTag(event)
    if (!dTag?.startsWith(D_TAG_PREFIX)) continue
    const previous = newest.get(dTag)
    if (!previous || event.created_at > previous.created_at) newest.set(dTag, event)
  }

  const backups: SparkRelayBackup[] = []
  for (const [dTag, event] of newest) {
    if (isDeleted(event)) continue
    try {
      const mnemonic = normalizeSparkMnemonic(await signer.nip44Decrypt(event.pubkey, event.content))
      const words = mnemonic.split(' ')
      if (![12, 15, 18, 21, 24].includes(words.length)) continue
      backups.push({
        event,
        dTag,
        walletId: dTag.startsWith(D_TAG_PREFIX + ':') ? dTag.slice(D_TAG_PREFIX.length + 1) : null,
        mnemonic,
        createdAt: event.created_at,
      })
    } catch {
      // A backup that cannot be decrypted by this identity is not restorable.
    }
  }
  return backups.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getSparkRelayBackupStatuses(
  signer: FireWispSigner,
  mnemonic: string,
  relays: string[],
): Promise<SparkRelayStatus[]> {
  const walletId = await computeSparkWalletId(mnemonic)
  const dTag = sparkBackupDTag(walletId)
  const filter = { kinds: [SPARK_BACKUP_KIND], authors: [signer.pubkey], '#d': [dTag] }
  return Promise.all([...new Set(relays)].map(async relay => {
    try {
      const events = await nostrPool.query([relay], filter, 3500)
      return { relay, hasBackup: events.some(event => getDTag(event) === dTag && !isDeleted(event)) }
    } catch {
      return { relay, hasBackup: false }
    }
  }))
}

export async function deleteSparkRelayBackups(
  signer: FireWispSigner,
  readRelays: string[],
  writeRelays: string[],
): Promise<PublishResult[]> {
  if (!signer.canSign) throw new Error('The active Nostr signer cannot delete relay backups.')
  const relays = [...new Set([...readRelays, ...writeRelays])]
  const events = await nostrPool.query(relays, {
    kinds: [SPARK_BACKUP_KIND],
    authors: [signer.pubkey],
  }, 7000)
  const dTags = [...new Set(events.filter(event => isSparkBackup(event) && !isDeleted(event)).map(getDTag).filter((tag): tag is string => Boolean(tag)))]
  if (dTags.length === 0) return []
  const results: PublishResult[] = []
  for (const dTag of dTags) {
    const tombstone = await signer.signEvent({
      kind: SPARK_BACKUP_KIND,
      created_at: Math.floor(Date.now() / 1000),
      content: '',
      tags: [['d', dTag], ['deleted', 'true']],
    })
    results.push(...await nostrPool.publish([...new Set([...readRelays, ...writeRelays])], tombstone))
  }
  if (!results.some(result => result.ok)) {
    throw new Error('No relay confirmed deletion of the Spark backups.')
  }
  return results
}
