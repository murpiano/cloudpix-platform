import { describe, expect, it } from 'vitest';
import { cleanUser, logIn, logOut, saveAccount, userStore } from './user';

const HOME = { name: 'Kyiv', country: 'Ukraine', countryId: '804', lat: 50.45, lon: 30.52 };

describe('cleanUser', () => {
  it('keeps a whole user', () => {
    expect(cleanUser({ name: 'Ada', email: 'a@b.c', home: HOME })).toEqual({
      name: 'Ada',
      email: 'a@b.c',
      home: HOME,
    });
  });

  it('turns anything else into nobody', () => {
    expect(cleanUser(null)).toBeNull();
    expect(cleanUser({ name: 'Ada' })).toBeNull();
    expect(cleanUser({ name: 'Ada', email: 'a@b.c', home: { name: 'Kyiv' } })).toBeNull();
  });
});

describe('the session', () => {
  it('logs in, changes the account and logs out again', () => {
    logIn({ name: 'Ada', email: 'a@b.c', home: HOME });
    expect(userStore.get().user?.name).toBe('Ada');
    saveAccount({ name: 'Ada L' });
    expect(userStore.get().user).toMatchObject({ name: 'Ada L', email: 'a@b.c' });
    logOut();
    expect(userStore.get().user).toBeNull();
  });

  it('changes nothing when nobody is logged in', () => {
    logOut();
    saveAccount({ name: 'Nobody' });
    expect(userStore.get().user).toBeNull();
  });
});
