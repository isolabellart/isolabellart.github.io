import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { ArrowDownLeft, ArrowUpRight, Copy, RefreshCw, Wallet, ShieldAlert, X } from 'lucide-react'
import { useAuthStore } from '../lib/store/useAuthStore'
import {
  connectSparkWallet, createRecoveryPhrase, validateRecoveryPhrase,
  isSparkWalletConnected, getSparkInfo, prepareSparkPayment,
  sendPreparedSparkPayment, createSparkInvoice, listSparkPayments,
  onSparkStatus, hasBreezApiKey, disconnectSparkWallet,
} from '../lib/spark/client'

type Payment = { id:string; paymentType?:string; amount?:string|number; fees?:string|number; details?:{description?:string}; timestamp?:string|number; status?:string }
type PreparedPayment = { prepareResponse:unknown; feeSats:number }

export function SparkWalletPage() {
  const pubkey = useAuthStore(s => s.pubkey)
  const [connected,setConnected]=useState(isSparkWalletConnected())
  const [balance,setBalance]=useState<number|null>(null)
  const [phrase,setPhrase]=useState('')
  const [generatedPhrase,setGeneratedPhrase]=useState('')
  const [showPhrase,setShowPhrase]=useState(false)
  const [connecting,setConnecting]=useState(false)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [status,setStatus]=useState('')
  const [payments,setPayments]=useState<Payment[]>([])
  const [sendInvoice,setSendInvoice]=useState('')
  const [prepared,setPrepared]=useState<PreparedPayment|null>(null)
  const [invoiceAmount,setInvoiceAmount]=useState('')
  const [invoiceDescription,setInvoiceDescription]=useState('')
  const [invoice,setInvoice]=useState('')
  const [invoiceQr,setInvoiceQr]=useState('')
  const [copied,setCopied]=useState(false)

  useEffect(()=>{onSparkStatus(setStatus);return()=>onSparkStatus(null)},[])
  const hasAccount=Boolean(pubkey)
  const formattedBalance=useMemo(()=>balance===null?'—':new Intl.NumberFormat().format(balance),[balance])

  async function refresh(){
    setLoading(true);setError('')
    try{
      const info=await getSparkInfo()
      setBalance(Number(info.balanceSats)||0)
      setPayments(await listSparkPayments())
    }catch(e){setError(e instanceof Error?e.message:String(e))}
    finally{setLoading(false)}
  }
  useEffect(()=>{if(connected)void refresh()},[connected])

  function startNewWallet(){
    setGeneratedPhrase(createRecoveryPhrase())
    setShowPhrase(true)
    setError('')
  }
  async function connect(mnemonic:string){
    if(!pubkey){setError('Sign in to Postilla before setting up Spark.');return}
    setConnecting(true);setError('')
    try{
      const info=await connectSparkWallet(mnemonic,pubkey)
      setBalance(Number(info.balanceSats)||0)
      setConnected(true)
      setPayments(await listSparkPayments())
      setPhrase('')
      setGeneratedPhrase('')
      setShowPhrase(false)
    }catch(e){setError(e instanceof Error?e.message:String(e))}
    finally{setConnecting(false)}
  }
  async function prepareSend(){
    setError('');setPrepared(null)
    try{setPrepared(await prepareSparkPayment(sendInvoice))}
    catch(e){setError(e instanceof Error?e.message:String(e))}
  }
  async function confirmSend(){
    if(!prepared)return
    setLoading(true);setError('')
    try{
      await sendPreparedSparkPayment(prepared.prepareResponse)
      setPrepared(null);setSendInvoice('')
      await refresh()
    }catch(e){setError(e instanceof Error?e.message:String(e))}
    finally{setLoading(false)}
  }
  async function makeInvoice(){
    setError('')
    try{
      const request=await createSparkInvoice(Number(invoiceAmount),invoiceDescription)
      setInvoice(request)
      setInvoiceQr(await QRCode.toDataURL(request,{margin:1,width:240}))
      await refresh()
    }catch(e){setError(e instanceof Error?e.message:String(e))}
  }
  async function copy(text:string){
    try{await navigator.clipboard.writeText(text);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}
    catch{setError('Clipboard access was denied by the browser.')}
  }
  async function disconnect(){
    await disconnectSparkWallet()
    setConnected(false);setBalance(null);setPayments([]);setInvoice('');setInvoiceQr('')
    setStatus('Disconnected. The recovery phrase was not saved by Postilla Web.')
  }

  return <div className="min-h-full">
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--postilla-border)] bg-[var(--postilla-bg)]/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-[var(--postilla-accent)]"/><h1 className="font-bold">Spark wallet</h1><span className="text-xs text-[var(--postilla-secondary)]">Breez SDK</span></div>
      {connected&&<button onClick={()=>void refresh()} disabled={loading} className="rounded-lg border border-[var(--postilla-border)] p-2" title="Refresh"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/></button>}
    </header>
    {!hasBreezApiKey()&&<div className="m-3 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200"><ShieldAlert className="h-4 w-4 shrink-0"/>This preview was built without the Breez API Key. Add the existing BREEZ_API_KEY to the GitHub Pages repository Actions secrets, then rebuild the preview.</div>}
    {!hasAccount&&<p className="m-3 rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-surface)] p-3 text-sm">Sign in with your Nostr identity before creating or restoring the wallet.</p>}
    {error&&<div className="m-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}
    {status&&<p className="px-4 py-2 text-xs text-[var(--postilla-secondary)]">{status}</p>}

    {!connected&&!showPhrase&&<div className="space-y-3 p-4">
      <div className="rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)] p-4">
        <h2 className="mb-2 font-semibold">Self-custodial Lightning wallet</h2>
        <p className="text-sm text-[var(--postilla-secondary)]">Create a new Spark wallet or restore one with its BIP-39 recovery phrase. The wallet data is stored by the Breez SDK in this browser's IndexedDB storage.</p>
        <p className="mt-3 text-xs text-[var(--postilla-secondary)]">For this preview, Postilla Web does not save your recovery phrase to localStorage or sessionStorage. You must keep your own offline backup and re-enter the phrase after a full browser reload.</p>
      </div>
      <button onClick={startNewWallet} disabled={!hasAccount||!hasBreezApiKey()} className="w-full rounded-xl bg-[var(--postilla-accent)] p-3 text-sm font-semibold text-[#1B1916] disabled:opacity-40">Create a new wallet</button>
      <div className="rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)] p-4 space-y-3">
        <h3 className="font-semibold">Restore an existing wallet</h3>
        <textarea value={phrase} onChange={e=>setPhrase(e.target.value)} rows={3} placeholder="Enter your 12 / 15 / 18 / 21 / 24 word recovery phrase" className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-3 text-sm"/>
        <button onClick={()=>void connect(phrase)} disabled={!hasAccount||!hasBreezApiKey()||connecting||!validateRecoveryPhrase(phrase)} className="w-full rounded-lg border border-[var(--postilla-border)] px-3 py-2 text-sm disabled:opacity-40">{connecting?'Connecting…':'Restore and connect'}</button>
      </div>
    </div>}

    {!connected&&showPhrase&&<div className="space-y-3 p-4">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100"><ShieldAlert className="mr-1 inline h-4 w-4"/>Write these words down and store them offline. Anyone who obtains them can control the wallet.</div>
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)] p-4 sm:grid-cols-3">
        {generatedPhrase.split(' ').map((word,index)=><div key={index} className="rounded-md border border-[var(--postilla-border)] px-2 py-2 text-sm"><span className="mr-2 text-xs text-[var(--postilla-secondary)]">{index+1}.</span>{word}</div>)}
      </div>
      <label className="flex items-start gap-2 text-xs text-[var(--postilla-secondary)]"><input type="checkbox" checked={phrase.trim()==='__confirmed__'} onChange={e=>setPhrase(e.target.checked?'__confirmed__':'')}/>I have written down the recovery phrase and stored it safely offline.</label>
      <button onClick={()=>void connect(generatedPhrase)} disabled={connecting||phrase.trim()!=='__confirmed__'||!hasBreezApiKey()||!hasAccount} className="w-full rounded-lg bg-[var(--postilla-accent)] px-3 py-3 text-sm font-semibold text-[#1B1916] disabled:opacity-40">{connecting?'Connecting…':'I backed it up — create wallet'}</button>
      <button onClick={()=>{setShowPhrase(false);setPhrase('');setGeneratedPhrase('')}} className="w-full rounded-lg border border-[var(--postilla-border)] px-3 py-2 text-sm">Cancel</button>
    </div>}

    {connected&&<div className="space-y-4 p-4">
      <section className="rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)] p-5 text-center">
        <p className="text-xs uppercase tracking-wider text-[var(--postilla-secondary)]">Available balance</p>
        <p className="my-2 text-3xl font-semibold tabular-nums">{formattedBalance} <span className="text-sm font-normal">sats</span></p>
        <div className="flex justify-center gap-2"><button onClick={()=>void refresh()} disabled={loading} className="rounded-lg border border-[var(--postilla-border)] px-3 py-2 text-xs">Refresh balance</button><button onClick={()=>void disconnect()} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300">Disconnect</button></div>
      </section>
      <section className="rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)] p-4 space-y-3">
        <h2 className="flex items-center gap-2 font-semibold"><ArrowUpRight className="h-4 w-4"/>Send Lightning payment</h2>
        <textarea value={sendInvoice} onChange={e=>{setSendInvoice(e.target.value);setPrepared(null)}} rows={3} placeholder="Paste a BOLT11 Lightning invoice" className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-3 text-sm"/>
        {!prepared?<button onClick={()=>void prepareSend()} disabled={!sendInvoice.trim()} className="rounded-lg bg-[var(--postilla-accent)] px-4 py-2 text-sm font-semibold text-[#1B1916] disabled:opacity-40">Check payment and fees</button>:
          <div className="space-y-2 rounded-lg border border-[var(--postilla-border)] p-3 text-sm"><p>Estimated fee: <strong>{prepared.feeSats} sats</strong></p><p className="text-xs text-[var(--postilla-secondary)]">Review the invoice in your wallet before confirming. The SDK response is used for the actual payment.</p><div className="flex gap-2"><button onClick={()=>void confirmSend()} disabled={loading} className="rounded-lg bg-[var(--postilla-accent)] px-4 py-2 text-sm font-semibold text-[#1B1916]">Confirm payment</button><button onClick={()=>setPrepared(null)} className="rounded-lg border border-[var(--postilla-border)] px-4 py-2 text-sm">Cancel</button></div></div>}
      </section>
      <section className="rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)] p-4 space-y-3">
        <h2 className="flex items-center gap-2 font-semibold"><ArrowDownLeft className="h-4 w-4"/>Receive Lightning payment</h2>
        <input inputMode="numeric" value={invoiceAmount} onChange={e=>setInvoiceAmount(e.target.value.replace(/[^0-9]/g,''))} placeholder="Amount in sats" className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-3 text-sm"/>
        <input value={invoiceDescription} onChange={e=>setInvoiceDescription(e.target.value)} placeholder="Description (optional)" className="w-full rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-bg)] p-3 text-sm"/>
        <button onClick={()=>void makeInvoice()} disabled={!invoiceAmount||Number(invoiceAmount)<=0} className="rounded-lg bg-[var(--postilla-accent)] px-4 py-2 text-sm font-semibold text-[#1B1916]">Create invoice</button>
        {invoice&&<div className="space-y-2 rounded-lg border border-[var(--postilla-border)] p-3 text-center">{invoiceQr&&<img src={invoiceQr} alt="Lightning invoice QR" className="mx-auto h-48 w-48"/>}<p className="break-all text-xs">{invoice}</p><button onClick={()=>void copy(invoice)} className="inline-flex items-center gap-2 rounded-lg border border-[var(--postilla-border)] px-3 py-2 text-xs"><Copy className="h-3 w-3"/>{copied?'Copied':'Copy invoice'}</button></div>}
      </section>
      <section className="rounded-xl border border-[var(--postilla-border)] bg-[var(--postilla-surface)] p-4">
        <h2 className="mb-3 font-semibold">Recent transactions</h2>
        {payments.length===0?<p className="text-sm text-[var(--postilla-secondary)]">No transactions yet.</p>:<div className="divide-y divide-[var(--postilla-border)]">{payments.map((p,i)=><div key={p.id||i} className="flex items-center justify-between gap-3 py-2 text-sm"><div className="min-w-0"><p className="truncate">{p.details?.description||p.paymentType||'Payment'}</p><p className="text-xs text-[var(--postilla-secondary)]">{p.status||''} · {p.timestamp?new Date(Number(p.timestamp)*1000).toLocaleString():''}</p></div><strong className="shrink-0 tabular-nums">{Number(p.amount)||0} sats</strong></div>)}</div>}
      </section>
    </div>}
  </div>
}
