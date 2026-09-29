import { addComment, demoSocial, toggleLike } from '@/data/social';
import type { Social } from '@/data/social';
import { createStore } from './store';

/** Likes and comments while the page is open. Nothing is saved: they are stubs until the backend. */
export const socialStore = createStore<{ byKey: ReadonlyMap<string, Social> }>({ byKey: new Map() });

export const socialFor = (key: string): Social =>
  socialStore.get().byKey.get(key) ?? demoSocial(key);

const update = (key: string, change: (social: Social) => Social) => {
  const byKey = new Map(socialStore.get().byKey);
  byKey.set(key, change(socialFor(key)));
  socialStore.set({ byKey });
};

export const likePhoto = (key: string) => update(key, toggleLike);

export const commentPhoto = (key: string, text: string) =>
  update(key, (social) => addComment(social, text));
