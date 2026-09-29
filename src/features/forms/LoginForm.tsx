import { useState } from 'react';
import type { Archive } from '@/data/archive';
import type { PickedPlace } from '@/data/places';
import { logIn } from '@/state/user';
import { PlaceField } from './PlaceField';
import { Acts, Sheet } from './Sheet';

/** Logging in swaps the demo for the owner's archive, so the page opens again with it. */
export function LoginForm({
  archive,
  why,
  onClose,
}: {
  archive: Archive;
  why: string | null;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [home, setHome] = useState<PickedPlace | null>(null);

  const submit = () => {
    if (!name.trim() || !home) return;
    const { name: city, country, countryId, lat, lon } = home;
    logIn({
      name: name.trim(),
      email: email.trim(),
      home: { name: city, country, countryId, lat, lon },
    });
    location.reload();
  };

  return (
    <Sheet
      title="Log in"
      lead={`${why ? `${why} ` : ''}Your home base is where every trip starts and where it comes back to.`}
      onClose={onClose}
    >
      <label className="sheet__field" htmlFor="fName">
        Name
        <input
          id="fName"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="sheet__field" htmlFor="fMail">
        Email
        <input
          id="fMail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="sheet__field" htmlFor="fPass">
        Password
        <input id="fPass" type="password" autoComplete="current-password" />
      </label>
      <PlaceField id="fHome" label="Home base" archive={archive} value={home} onPick={setHome} />
      <Acts>
        <button type="button" className="sheet__btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="sheet__btn is-main"
          disabled={!name.trim() || !home}
          onClick={submit}
        >
          Log in
        </button>
      </Acts>
      <p className="sheet__note">
        There is no server yet. Your archive stays in this browser; it starts as a copy of the demo,
        so there is something to play with.
      </p>
    </Sheet>
  );
}
