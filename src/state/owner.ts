import { relinkInto } from '@/data/archive';
import type { Archive } from '@/data/archive';
import type { Repository } from '@/data/repository';
import type { ArchiveData } from '@/data/types';
import { createStore } from './store';

/** Counts the changes the owner made: React reads it to render the archive again. */
export const ownerStore = createStore<{ rev: number }>({ rev: 0 });

let source: { archive: Archive; repo: Repository } | null = null;

export const setSource = (archive: Archive, repo: Repository): void => {
  source = { archive, repo };
};

export const canEdit = (): boolean => source?.repo.editable ?? false;

export const repository = (): Repository | null => source?.repo ?? null;

/** Runs one edit on the stored graph, relinks it in place, saves it and counts it. */
export const editArchive = async (
  fn: (data: ArchiveData, repo: Repository) => void | Promise<void>,
): Promise<void> => {
  if (!source || !source.repo.editable) return;
  const { archive, repo } = source;
  await fn(archive.data, repo);
  relinkInto(archive, archive.data);
  repo.save(archive.data);
  ownerStore.set({ rev: ownerStore.get().rev + 1 });
};
