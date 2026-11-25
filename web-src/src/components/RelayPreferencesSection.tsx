import { useState } from 'react'
import { Radio, Plus, Trash2, Send, Languages } from 'lucide-react'
import { useAuthStore } from '../lib/store/useAuthStore'
import { useNostrStore } from '../lib/store/useNostrStore'
import { useSettingsStore } from '../lib/store/useSettingsStore'
import { createRelayPreferenceTemplates } from '../lib/nostr/relayPreferences'
import { nostrPool } from '../lib/nostr/pool'

export function RelayPreferencesSection() {
  const settings = useSettingsStore()
  const signer = useAuthStore((s) => s.signer)
  const userReadRelays = useNostrStore((s) => s.userReadRelays)
  const userWriteRelays = useNostrStore((s) => s.userWriteRelays)
  const [dmInput, setDmInput] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const broadcast = async () => {
    if (!signer?.canSign) { setStatus('Sign in with a signing account to publish relay preferences.'); return }
    const destinations = [...new Set([
      ...settings.getReadRelays(), ...settings.getWriteRelays(),
      ...userReadRelays, ...userWriteRelays, ...settings.dmRelays, ...settings.searchRelays,
    ])]
    if (!destinations.length) { setStatus('Add at least one Nostr relay before broadcasting.'); return }
    setBusy(true); setStatus('')
    try {
      const templates = createRelayPreferenceTemplates({
        relays: settings.relays,
        dmRelays: settings.dmRelays,
        blossomServers: settings.blossomServers,
        searchRelays: settings.searchRelays,
      })
      const outcomes: Array<{kind:number;ok:number;total:number}> = []
      for (const template of templates) {
        const signed = await signer.signEvent(template)
        const results = await nostrPool.publish(destinations, signed)
        outcomes.push({ kind: template.kind, ok: results.filter((r) => r.ok).length, total: results.length })
      }
      const failed = outcomes.filter((o) => o.ok === 0)
      setStatus(failed.length
        ? 'Published with incomplete relay confirmation: ' + outcomes.map((o) => `kind ${o.kind}: ${o.ok}/${o.total}`).join(' · ')
        : 'All relay preference lists confirmed: ' + outcomes.map((o) => `kind ${o.kind} ${o.ok}/${o.total}`).join(' · '))
    } catch (error) { setStatus(error instanceof Error ? error.message : String(error)) }
    finally { setBusy(false) }
  }

  return <section className="space-y-3 border-t border-[var(--postilla-border)] p-4">
    <h2 className="flex items-center gap-2 text-sm font-semibold"><Radio className="h-4 w-4 text-[var(--postilla-accent)]"/>Nostr service lists</h2>
    <p className="text-xs text-[var(--postilla-secondary)]">Read/Write relays use NIP-65. Private-message inbox relays use NIP-17 kind 10050. Blossom servers use kind 10063. Search relays use kind 10007. These lists are separate: Blossom URLs are never treated as Nostr relays.</p>
    <div className="space-y-2">
      <div className="text-xs font-semibold">NIP-17 DM inbox relays</div>
      {settings.dmRelays.map((url) => <div key={url} className="flex items-center justify-between rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-surface)] px-3 py-2 text-xs"><code className="truncate">{url}</code><button onClick={() => settings.removeDmRelay(url)} aria-label="Remove DM relay"><Trash2 className="h-3.5 w-3.5"/></button></div>)}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (settings.addDmRelay(dmInput)) setDmInput('') }}>
        <input value={dmInput} onChange={(e) => setDmInput(e.target.value)} placeholder="wss://your-dm-relay.example" className="min-w-0 flex-1 rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-surface)] px-3 py-2 text-xs"/>
        <button className="rounded-lg bg-[var(--postilla-accent)] px-3 text-xs"><Plus className="h-4 w-4"/></button>
      </form>
    </div>
    <div className="space-y-2">
      <div className="text-xs font-semibold">NIP-51 Search relays</div>
      {settings.searchRelays.map((url) => <div key={url} className="flex items-center justify-between rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-surface)] px-3 py-2 text-xs"><code className="truncate">{url}</code><button onClick={() => settings.removeSearchRelay(url)} aria-label="Remove Search relay"><Trash2 className="h-3.5 w-3.5"/></button></div>)}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (settings.addSearchRelay(searchInput)) setSearchInput('') }}>
        <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="wss://search-relay.example" className="min-w-0 flex-1 rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-surface)] px-3 py-2 text-xs"/>
        <button className="rounded-lg bg-[var(--postilla-accent)] px-3 text-xs"><Plus className="h-4 w-4"/></button>
      </form>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label className="flex items-center gap-2 text-xs"><Languages className="h-4 w-4 text-[var(--postilla-accent)]"/>Interface language
        <select value={settings.language} onChange={(e) => settings.setLanguage(e.target.value as 'en'|'it')} className="rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-surface)] px-2 py-1.5"><option value="en">English</option><option value="it">Italiano</option></select>
      </label>
      <button onClick={() => void broadcast()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-[var(--postilla-accent)] px-3 py-2 text-xs font-semibold text-[#1B1916] disabled:opacity-50"><Send className="h-3.5 w-3.5"/>{busy?'Publishing…':'Broadcast Nostr lists'}</button>
    </div>
    {status && <p role="status" className="text-xs text-[var(--postilla-secondary)]">{status}</p>}
  </section>
}
