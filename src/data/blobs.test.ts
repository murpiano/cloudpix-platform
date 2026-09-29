import { describe, expect, it, vi } from 'vitest';
import { forgetOwnUrl, forgetOwnUrls, ownUrl, rememberOwnUrl } from './blobs';

describe('the owner photo urls', () => {
  it('lets one url go, and revokes it so the browser can free the blob', () => {
    const revoke = vi.fn();
    vi.stubGlobal('URL', { ...URL, revokeObjectURL: revoke });
    forgetOwnUrls();
    rememberOwnUrl('p1', 'blob:one');
    rememberOwnUrl('p2', 'blob:two');
    forgetOwnUrl('p1');
    expect(revoke).toHaveBeenCalledWith('blob:one');
    expect(ownUrl('p1')).toBeNull();
    expect(ownUrl('p2')).toBe('blob:two');
    vi.unstubAllGlobals();
  });
});
