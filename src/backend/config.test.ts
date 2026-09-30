import { describe, expect, it } from 'vitest';
import { backendConfig } from './config';

describe('backendConfig', () => {
  it('is there only when the address and the key are both given', () => {
    expect(
      backendConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_KEY: 'k' }),
    ).toEqual({
      url: 'https://x.supabase.co',
      key: 'k',
    });
    expect(backendConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co' })).toBeNull();
    expect(backendConfig({ VITE_SUPABASE_KEY: 'k' })).toBeNull();
    expect(backendConfig({})).toBeNull();
  });

  it('takes empty and blank values, as an unset repository variable gives, for none', () => {
    expect(backendConfig({ VITE_SUPABASE_URL: '', VITE_SUPABASE_KEY: '' })).toBeNull();
    expect(backendConfig({ VITE_SUPABASE_URL: ' ', VITE_SUPABASE_KEY: ' ' })).toBeNull();
  });
});
