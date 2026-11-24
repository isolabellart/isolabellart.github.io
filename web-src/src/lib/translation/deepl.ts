const TOKEN_PATTERN = /(https?:\/\/[^\s]+|nostr:(?:npub1|nprofile1|note1|nevent1|naddr1)[0-9a-z]+|(?:npub|nprofile|note|nevent|naddr)1[0-9a-z]+|#[\p{L}\p{N}_]{1,64}|:[a-zA-Z0-9_+-]{2,}:)/gu

export async function translateTextWithDeepL(sourceText:string,apiKey:string,targetLanguage:string):Promise<string>{
 if(!apiKey.trim())throw new Error('A DeepL API key is required.')
 if(!sourceText.trim())return sourceText
 const endpoint=import.meta.env.VITE_POSTILLA_TRANSLATION_API
 if(!endpoint)throw new Error('The Postilla DeepL proxy is not configured yet. The browser cannot call DeepL directly; a backend endpoint is required.')
 const protectedValues:string[]=[]
 const protectedText=sourceText.replace(TOKEN_PATTERN,match=>{
  const marker='\uE000POSTILLA'+protectedValues.length+'\uE001'
  protectedValues.push(match)
  return marker
 })
 let response:Response
 try{
  response=await fetch(endpoint,{
   method:'POST',
   headers:{'Content-Type':'application/json','X-DeepL-API-Key':apiKey.trim()},
   body:JSON.stringify({text:protectedText,target_lang:targetLanguage})
  })
 }catch{
  throw new Error('Unable to reach the Postilla translation service.')
 }
 if(!response.ok){
  if(response.status===401||response.status===403)throw new Error('DeepL rejected the API key or access to the translation service.')
  if(response.status===429)throw new Error('Translation rate limit reached. Please retry shortly.')
  throw new Error('Translation service returned HTTP '+response.status+'.')
 }
 const payload=await response.json() as {text?:string}
 if(typeof payload.text!=='string')throw new Error('Translation service returned an invalid response.')
 let translated=payload.text
 protectedValues.forEach((value,index)=>{
  const marker='\uE000POSTILLA'+index+'\uE001'
  if(translated.split(marker).length!==2)throw new Error('DeepL changed a protected Nostr reference or link; translation was not applied.')
  translated=translated.replace(marker,value)
 })
 return translated
}
