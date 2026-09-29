import { beforeEach, describe, expect, it } from 'vitest';
import { appStore, INITIAL_STATE } from '@/state/app-state';
import { logIn, logOut } from '@/state/user';
import { goArchive } from './links';

const HOME = { name: 'Kyiv', country: 'Ukraine', countryId: '804', lat: 50.45, lon: 30.52 };

describe('goArchive', () => {
  beforeEach(() => {
    appStore.set({ ...INITIAL_STATE });
  });

  it('asks a visitor to log in, and leaves the archive shut', () => {
    logOut();
    goArchive({ kind: 'trips' });
    const { archive, form } = appStore.get();
    expect(archive).toBeNull();
    expect(form).toMatchObject({ kind: 'login' });
    expect(form?.kind === 'login' ? form.why : '').toMatch(/archive/i);
  });

  it('opens the archive for the owner', () => {
    logIn({ name: 'Ada', email: 'a@b.c', home: HOME });
    goArchive({ kind: 'trips' });
    expect(appStore.get().archive?.stack).toEqual([{ kind: 'trips' }]);
    expect(appStore.get().form).toBeNull();
    logOut();
  });
});
