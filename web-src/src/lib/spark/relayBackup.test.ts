import { describe, expect, it } from 'vitest'
import { computeSparkWalletId, normalizeSparkMnemonic, sparkBackupDTag } from './relayBackup'

describe('Spark NIP-78 relay backup format', () => {
  it('normalizes mnemonic whitespace and casing identically to Android', () => {
    expect(normalizeSparkMnemonic('  ABANDON   ability\nABOUT  ')).toBe('abandon ability about')
  })

  it('uses the same deterministic SHA-256 wallet identifier as Android', async () => {
    const id = await computeSparkWalletId('abandon ability able about above absent absorb abstract absurd abuse access accident')
    expect(id).toBe('68c6ab3eba220da7')
  })

  it('uses the interoperable Android d-tag prefix', () => {
    expect(sparkBackupDTag('0123456789abcdef')).toBe('spark-wallet-backup:0123456789abcdef')
  })
})
