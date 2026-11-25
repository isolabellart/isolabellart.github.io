const ITERATIONS = 310_000
const encoder = new TextEncoder()
const decoder = new TextDecoder()

interface EncryptedNwcPayload {
  v: 1
  iterations: number
  salt: string
  iv: string
  ciphertext: string
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function deriveAesKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  const saltCopy = new Uint8Array(salt.byteLength)
  saltCopy.set(salt)
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltCopy.buffer, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptNwcUri(uri: string, passphrase: string): Promise<string> {
  const clean = uri.trim()
  if (!clean.startsWith('nostr+walletconnect://')) throw new Error('Enter a valid NWC connection URI.')
  if (passphrase.length < 8) throw new Error('Use a passphrase of at least 8 characters.')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveAesKey(passphrase, salt, ITERATIONS)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(encoder.encode(clean)))
  const payload: EncryptedNwcPayload = {
    v: 1,
    iterations: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(cipher)),
  }
  return JSON.stringify(payload)
}

export async function decryptNwcUri(serialized: string, passphrase: string): Promise<string> {
  if (passphrase.length < 8) throw new Error('Enter the passphrase used to encrypt the NWC connection.')
  let payload: EncryptedNwcPayload
  try {
    payload = JSON.parse(serialized) as EncryptedNwcPayload
  } catch {
    throw new Error('The saved encrypted NWC record is invalid.')
  }
  if (payload.v !== 1 || !Number.isSafeInteger(payload.iterations) || payload.iterations < 100_000 || payload.iterations > 1_000_000) {
    throw new Error('Unsupported or unsafe encrypted NWC record.')
  }
  try {
    const key = await deriveAesKey(passphrase, fromBase64(payload.salt), payload.iterations)
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(fromBase64(payload.iv)) },
      key,
      toArrayBuffer(fromBase64(payload.ciphertext)),
    )
    const uri = decoder.decode(plain)
    if (!uri.startsWith('nostr+walletconnect://')) throw new Error('Wrong NWC payload')
    return uri
  } catch {
    throw new Error('Unable to unlock the saved NWC connection. Check the passphrase.')
  }
}
