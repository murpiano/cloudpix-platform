export interface BackendConfig {
  url: string;
  key: string;
}

/**
 * Where the backend lives, from the build's environment. Without both values there is no
 * backend: the app keeps everything in the browser, as before.
 */
export const backendConfig = (
  env: { VITE_SUPABASE_URL?: string; VITE_SUPABASE_KEY?: string } = import.meta.env,
): BackendConfig | null => {
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_KEY?.trim();
  return url && key ? { url, key } : null;
};
