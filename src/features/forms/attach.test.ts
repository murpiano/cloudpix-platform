import { describe, expect, it, vi } from 'vitest';
import type { Repository } from '@/data/repository';
import type { PhotoRef } from '@/data/types';
import { attachPhotos } from './attach';

const file = (name: string): File => new File([new Uint8Array([1])], name);

const repo = (over: Partial<Repository> = {}): Repository => ({
  editable: true,
  load: () => Promise.resolve({ countries: [], trips: [] }),
  save: vi.fn(),
  addPhoto: (_blob: Blob, name: string) =>
    Promise.resolve({ kind: 'own', id: `id-${name}`, name } as PhotoRef),
  dropPhotos: vi.fn(() => Promise.resolve()),
  clear: vi.fn(),
  ...over,
});

const asIs = (blob: Blob) => Promise.resolve(blob);

describe('attachPhotos', () => {
  it('keeps every file it could read and names the ones it could not', async () => {
    const out = await attachPhotos([file('one.jpg'), file('two.jpg')], repo(), asIs);
    expect(out.refs.map((ref) => (ref.kind === 'own' ? ref.name : ''))).toEqual([
      'one.jpg',
      'two.jpg',
    ]);
    expect(out.skipped).toEqual([]);
  });

  it('stores nothing at all when one file cannot be read', async () => {
    const store = repo();
    const out = await attachPhotos([file('bad.png'), file('good.jpg')], store, (blob, name) =>
      name === 'bad.png' ? Promise.reject(new Error('no')) : Promise.resolve(blob),
    );
    expect(out.skipped).toEqual(['bad.png']);
    expect(out.refs).toEqual([]);
  });

  it('drops what it already stored when storage says no, and passes the error on', async () => {
    const dropPhotos = vi.fn(() => Promise.resolve());
    const store = repo({
      dropPhotos,
      addPhoto: (_blob: Blob, name: string) =>
        name === 'two.jpg'
          ? Promise.reject(new Error('out of room'))
          : Promise.resolve({ kind: 'own', id: 'id-one', name } as PhotoRef),
    });
    await expect(attachPhotos([file('one.jpg'), file('two.jpg')], store, asIs)).rejects.toThrow(
      'out of room',
    );
    expect(dropPhotos).toHaveBeenCalledWith([{ kind: 'own', id: 'id-one', name: 'one.jpg' }]);
  });
});
