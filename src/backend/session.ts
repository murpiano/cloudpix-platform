import { backendConfig } from './config';
import type { Backend } from './types';

let current: Backend | null = null;

/** Sets the backend up once, at start; null when the build has none (the app stays local). */
export const startBackend = async (): Promise<Backend | null> => {
  const config = backendConfig();
  if (!config) return null;
  const { createSupabase } = await import('./supabase');
  current = await createSupabase(config);
  return current;
};

/** The backend, once `startBackend` has made it. */
export const backend = (): Backend | null => current;
