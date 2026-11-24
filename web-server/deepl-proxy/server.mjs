import http from 'node:http'

const PORT=Number(process.env.PORT||8091)
const ALLOWED_ORIGINS=new Set((process.env.CORS_ORIGINS||'https://postilla.isolabellart.it.com').split(',').map(x=>x.trim()).filter(Boolean))
const WINDOW_MS=60_000
const MAX_REQUESTS=30
const BODY_LIMIT=64*1024
const requests=new Map()

function send(res,status,data,headers={}){
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers})
 res.end(JSON.stringify(data))
}
function cors(req,res){
 const origin=req.headers.origin
 if(!origin||!ALLOWED_ORIGINS.has(origin))return false
 res.setHeader('Access-Control-Allow-Origin',origin)
 res.setHeader('Vary','Origin')
 res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS')
 res.setHeader('Access-Control-Allow-Headers','Content-Type, X-DeepL-API-Key')
 return true
}
function allowedRate(ip){
 const now=Date.now(),state=requests.get(ip)||{start:now,count:0}
 if(now-state.start>WINDOW_MS){state.start=now;state.count=0}
 state.count++;requests.set(ip,state)
 return state.count<=MAX_REQUESTS
}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url||'/', 'http://localhost')
 if(url.pathname==='/health'&&req.method==='GET')return send(res,200,{ok:true})
 if(url.pathname!=='/v1/deepl/translate')return send(res,404,{error:'not_found'})
 const hasCors=cors(req,res)
 if(req.method==='OPTIONS')return hasCors?send(res,204,{}):send(res,403,{error:'origin_not_allowed'})
 if(req.method!=='POST')return send(res,405,{error:'method_not_allowed'})
 if(!hasCors)return send(res,403,{error:'origin_not_allowed'})
 const ip=req.socket.remoteAddress||'unknown'
 if(!allowedRate(ip))return send(res,429,{error:'rate_limited'})
 const apiKey=String(req.headers['x-deepl-api-key']||'').trim()
 if(!apiKey||apiKey.length>256)return send(res,401,{error:'api_key_required'})
 let body=''
 try{
  for await(const chunk of req){body+=chunk;if(body.length>BODY_LIMIT)return send(res,413,{error:'request_too_large'})}
  const input=JSON.parse(body)
  const text=typeof input.text==='string'?input.text:''
  const target=typeof input.target_lang==='string'?input.target_lang.toUpperCase():''
  if(!text.trim()||text.length>30_000||!/^[A-Z]{2,5}(-[A-Z]{2,5})?$/.test(target))return send(res,400,{error:'invalid_request'})
  const host=apiKey.toLowerCase().endsWith(':fx')?'https://api-free.deepl.com':'https://api.deepl.com'
  const upstream=await fetch(host+'/v2/translate',{
   method:'POST',
   headers:{'Authorization':'DeepL-Auth-Key '+apiKey,'Content-Type':'application/json'},
   body:JSON.stringify({text:[text],target_lang:target,preserve_formatting:true,split_sentences:'nonewlines'}),
   signal:AbortSignal.timeout(35_000)
  })
  if(!upstream.ok){
   const status=upstream.status
   if(status===401||status===403)return send(res,401,{error:'deepl_auth_failed'})
   if(status===429)return send(res,429,{error:'deepl_rate_limited'})
   if(status===456)return send(res,429,{error:'deepl_quota_reached'})
   return send(res,502,{error:'deepl_upstream_error'})
  }
  const result=await upstream.json()
  const translated=result?.translations?.[0]?.text
  if(typeof translated!=='string')return send(res,502,{error:'invalid_deepl_response'})
  return send(res,200,{text:translated})
 }catch{
  return send(res,400,{error:'invalid_request_or_upstream_failure'})
 }
})
server.listen(PORT,'127.0.0.1',()=>process.stdout.write('Postilla DeepL proxy listening on 127.0.0.1:'+PORT+'\n'))
