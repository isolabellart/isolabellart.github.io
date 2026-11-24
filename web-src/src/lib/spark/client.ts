import { generateMnemonic, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'

type SparkPayment = {
  id: string
  paymentType?: string
  amount?: string | number
  fees?: string | number
  details?: { description?: string }
  timestamp?: string | number
  status?: string
  method?: unknown
}
type SparkInfo = { balanceSats: number; [key: string]: unknown }
type SparkStatusListener = (message: string) => void

const BREEZ_API_KEY = import.meta.env.VITE_BREEZ_API_KEY || ''
let sdkModule: any = null
let sdk: any = null
let eventListenerId: string | null = null
let initPromise: Promise<void> | null = null
let statusListener: SparkStatusListener | null = null

export function hasBreezApiKey(): boolean {
  return Boolean(BREEZ_API_KEY.trim())
}
export function onSparkStatus(listener: SparkStatusListener | null): void {
  statusListener = listener
}
function emitStatus(message: string): void {
  statusListener?.(message)
}

async function loadModule(): Promise<any> {
  if (sdkModule) return sdkModule
  sdkModule = await import('@breeztech/breez-sdk-spark/web')
  return sdkModule
}
async function initialize(): Promise<any> {
  if (!initPromise) {
    initPromise = (async () => {
      const mod = await loadModule()
      if (typeof mod.default === 'function') await mod.default()
    })().catch(error => {
      initPromise = null
      throw error
    })
  }
  await initPromise
  return sdkModule
}

export function createRecoveryPhrase(): string {
  return generateMnemonic(wordlist, 128)
}
export function validateRecoveryPhrase(mnemonic: string): boolean {
  const clean = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ')
  const count = clean.split(' ').length
  return [12, 15, 18, 21, 24].includes(count) && validateMnemonic(clean, wordlist)
}

export async function connectSparkWallet(mnemonic: string, accountPubkey: string): Promise<SparkInfo> {
  if (!hasBreezApiKey()) {
    throw new Error('Breez API Key is missing from this staging build. Add BREEZ_API_KEY to the GitHub Pages repository Actions secrets and rebuild the preview.')
  }
  if (!validateRecoveryPhrase(mnemonic)) throw new Error('The recovery phrase is not a valid BIP-39 phrase.')
  if (sdk) await disconnectSparkWallet()

  const mod = await initialize()
  emitStatus('Configuring Breez Spark…')
  const config = mod.defaultConfig('mainnet')
  config.apiKey = BREEZ_API_KEY.trim()
  const seed = { type: 'mnemonic', mnemonic: mnemonic.trim().toLowerCase().replace(/\s+/g, ' '), passphrase: undefined }
  const storageDir = 'postilla-spark-' + accountPubkey.toLowerCase()
  let builder = mod.SdkBuilder.new(config, seed)
  builder = await builder.withDefaultStorage(storageDir)
  emitStatus('Connecting to Spark mainnet…')
  sdk = await builder.build()

  try {
    const listener = {
      onEvent: (event: any) => {
        if (event?.type === 'synced') emitStatus('Spark wallet synchronized.')
        else if (event?.type === 'paymentSucceeded') emitStatus('Payment completed.')
        else if (event?.type === 'paymentFailed') emitStatus('Payment failed.')
        else if (event?.type === 'paymentPending') emitStatus('Payment pending.')
      },
    }
    eventListenerId = await sdk.addEventListener(listener)
    const info = await sdk.getInfo({})
    emitStatus('Spark wallet connected.')
    return info as SparkInfo
  } catch (error) {
    await disconnectSparkWallet()
    throw error
  }
}

export async function disconnectSparkWallet(): Promise<void> {
  if (!sdk) return
  const current = sdk
  sdk = null
  try {
    if (eventListenerId) await current.removeEventListener(eventListenerId)
    await current.disconnect()
  } finally {
    eventListenerId = null
  }
}
export function isSparkWalletConnected(): boolean { return Boolean(sdk) }
export async function getSparkInfo(): Promise<SparkInfo> {
  if (!sdk) throw new Error('Spark wallet is not connected.')
  return await sdk.getInfo({}) as SparkInfo
}
export async function prepareSparkPayment(paymentRequest: string): Promise<{ prepareResponse: any; feeSats: number }> {
  if (!sdk) throw new Error('Spark wallet is not connected.')
  const prepared = await sdk.prepareSendPayment({ paymentRequest: paymentRequest.trim() })
  const method = prepared.paymentMethod
  let feeSats = 0
  if (method?.type === 'bolt11Invoice') feeSats = Number(method.sparkTransferFeeSats || 0) + Number(method.lightningFeeSats || 0)
  else if (method?.type === 'sparkAddress' || method?.type === 'sparkInvoice') feeSats = Number(method.fee || 0)
  return { prepareResponse: prepared, feeSats }
}
export async function sendPreparedSparkPayment(prepareResponse: any): Promise<string> {
  if (!sdk) throw new Error('Spark wallet is not connected.')
  emitStatus('Sending payment…')
  const result = await sdk.sendPayment({
    prepareResponse,
    options: { type: 'bolt11Invoice', preferSpark: false, completionTimeoutSecs: 30 },
  })
  emitStatus('Payment submitted.')
  return String(result?.payment?.id || '')
}
export async function createSparkInvoice(amountSats: number, description: string): Promise<string> {
  if (!sdk) throw new Error('Spark wallet is not connected.')
  if (!Number.isSafeInteger(amountSats) || amountSats <= 0) throw new Error('Enter a positive whole number of sats.')
  emitStatus('Creating Lightning invoice…')
  const response = await sdk.receivePayment({
    paymentMethod: { type: 'bolt11Invoice', description: description.trim() || 'Postilla', amountSats, expirySecs: 3600 },
  })
  emitStatus('Invoice created.')
  return String(response.paymentRequest)
}
export async function listSparkPayments(limit = 30): Promise<SparkPayment[]> {
  if (!sdk) throw new Error('Spark wallet is not connected.')
  const response = await sdk.listPayments({ limit, offset: 0, sortAscending: false })
  return Array.isArray(response?.payments) ? response.payments as SparkPayment[] : []
}
