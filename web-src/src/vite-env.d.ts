/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BREEZ_API_KEY: string
  readonly VITE_POSTILLA_TRANSLATION_API: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
