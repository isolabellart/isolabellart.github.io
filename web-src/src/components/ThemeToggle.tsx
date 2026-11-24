import {useEffect,useState} from 'react'
import {Moon,Sun} from 'lucide-react'
type Theme='dark'|'light'
export function ThemeToggle({compact=false}:{compact?:boolean}){
 const [theme,setTheme]=useState<Theme>(()=>{try{return localStorage.getItem('postilla_web_theme')==='light'?'light':'dark'}catch{return 'dark'}})
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;try{localStorage.setItem('postilla_web_theme',theme)}catch{}},[theme])
 return <button type="button" onClick={()=>setTheme(v=>v==='dark'?'light':'dark')} title={theme==='dark'?'Switch to light appearance':'Switch to dark appearance'} aria-label={theme==='dark'?'Switch to light appearance':'Switch to dark appearance'} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--postilla-border)] bg-[var(--postilla-surface)] px-3 py-2 text-xs font-medium text-[var(--postilla-text)] hover:border-[var(--postilla-accent)]">{theme==='dark'?<Sun className="h-4 w-4"/>:<Moon className="h-4 w-4"/>}{!compact&&<span>{theme==='dark'?'Light appearance':'Dark appearance'}</span>}</button>
}
