import { buildDemo } from './demo';
import type { Repository } from './repository';
import type { Credit } from './types';

/** Logged out: the sample traveller, read-only, nothing kept. */
export const demoRepository = (credits: Credit[]): Repository => ({
  editable: false,
  load: () => Promise.resolve(buildDemo(credits)),
  save: () => {},
  addPhoto: () => Promise.reject(new Error('the demo keeps nothing')),
  dropPhotos: () => Promise.resolve(),
  readPhoto: () => Promise.resolve(null),
  restore: () => Promise.reject(new Error('the demo keeps nothing')),
  clear: () => Promise.resolve(),
});
