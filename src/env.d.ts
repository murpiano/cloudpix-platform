/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The Supabase project's address; with the key, it turns the backend on. */
  readonly VITE_SUPABASE_URL?: string;
  /** The Supabase project's public (anon) key. Safe in the page: row level security guards the data. */
  readonly VITE_SUPABASE_KEY?: string;
}
