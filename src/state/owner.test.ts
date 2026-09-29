import { beforeEach, describe, expect, it, vi } from 'vitest';
import { linkArchive } from '@/data/archive';
import { addAlbum } from '@/data/edits';
import type { Repository } from '@/data/repository';
import type { ArchiveData } from '@/data/types';
import { canEdit, editArchive, ownerStore, setSource } from './owner';

const data = (): ArchiveData => ({ countries: [], trips: [] });
const PARIS = { name: 'Paris', country: 'France', countryId: '250', lat: 48.86, lon: 2.35 };
const ALBUM = {
  title: 'Roofs',
  year: 2022,
  month: 5,
  day: 3,
  time: '10:00',
  place: PARIS,
  tripId: null,
};
const fake = (editable: boolean): Repository => ({
  editable,
  load: () => Promise.resolve(data()),
  save: vi.fn(),
  addPhoto: vi.fn(),
  dropPhotos: vi.fn(),
  clear: vi.fn(),
});

describe('editArchive', () => {
  beforeEach(() => {
    ownerStore.set({ rev: 0 });
  });

  it('runs the edit, relinks the same archive, saves it and counts a change', async () => {
    const archive = linkArchive(data());
    const repo = fake(true);
    setSource(archive, repo);
    expect(canEdit()).toBe(true);
    await editArchive((current) => {
      addAlbum(current, 'a1', ALBUM);
    });
    expect(archive.albums.map((album) => album.id)).toEqual(['a1']);
    expect(repo.save).toHaveBeenCalledWith(archive.data);
    expect(ownerStore.get().rev).toBe(1);
  });

  it('does nothing at all when the archive is the read-only demo', async () => {
    const archive = linkArchive(data());
    const repo = fake(false);
    setSource(archive, repo);
    expect(canEdit()).toBe(false);
    await editArchive((current) => {
      addAlbum(current, 'a1', ALBUM);
    });
    expect(archive.albums).toEqual([]);
    expect(repo.save).not.toHaveBeenCalled();
    expect(ownerStore.get().rev).toBe(0);
  });
});
