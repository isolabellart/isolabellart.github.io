import { describe, expect, it } from 'vitest'
import { decryptNwcUri, encryptNwcUri } from './nwcVault'

describe('encrypted NWC storage', () => {
  it('round-trips an NWC URI without storing plaintext in the serialized value', async () => {
    const uri = 'nostr+walletconnect://' + 'a'.repeat(64) + '?relay=wss%3A%2F%2Fwallet.example&secret=' + 'b'.repeat(64)
    const encrypted = await encryptNwcUri(uri, 'a-long-test-passphrase')
    expect(encrypted).not.toContain(uri)
    await expect(decryptNwcUri(encrypted, 'a-long-test-passphrase')).resolves.toBe(uri)
    await expect(decryptNwcUri(encrypted, 'wrong-passphrase')).rejects.toThrow()
  })
})
