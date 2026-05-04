/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TMDB_API_KEY: string
  readonly VITE_OMDB_API_KEY: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_TRAKT_CLIENT_ID: string
  readonly VITE_TRAKT_CLIENT_SECRET: string
  readonly VITE_TVDB_API_KEY: string
  readonly VITE_FANART_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}