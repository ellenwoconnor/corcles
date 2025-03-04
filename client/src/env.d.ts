/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  env?: {
    VITE_GOOGLE_OAUTH_CLIENT_ID: string
  }
}