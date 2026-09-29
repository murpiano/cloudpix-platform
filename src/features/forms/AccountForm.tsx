import { useState } from 'react';
import type { Archive } from '@/data/archive';
import type { PickedPlace } from '@/data/places';
import { repository } from '@/state/owner';
import { saveAccount, userStore } from '@/state/user';
import { BackupBox } from './BackupBox';
import { ConfirmButton } from './ConfirmButton';
import { accountProblem } from './fields';
import { PlaceField } from './PlaceField';
import { Acts, Sheet } from './Sheet';

/** Name, email, a new password twice, the home base, and a way back to the demo. */
export function AccountForm({ archive, onClose }: { archive: Archive; onClose: () => void }) {
  const user = userStore.get().user;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [pass, setPass] = useState('');
  const [again, setAgain] = useState('');
  const [home, setHome] = useState<PickedPlace | null>(user?.home ?? null);
  if (!user) return null;

  const problem = accountProblem({
    name,
    email,
    password: pass,
    again,
    home,
    passwordOptional: true,
  });
  const submit = () => {
    if (problem || !home) return;
    const { name: city, country, countryId, lat, lon } = home;
    saveAccount({
      name: name.trim(),
      email: email.trim(),
      home: { name: city, country, countryId, lat, lon },
    });
    onClose();
    // the home base moves the house on the globe and every flight that starts from it
    location.reload();
  };

  return (
    <Sheet
      title="Account"
      lead="Your home base is where every trip starts and comes back to, unless a trip says otherwise."
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
      <div className="sheet__row">
        <label className="sheet__field" htmlFor="fPass">
          New password
          <input
            id="fPass"
            type="password"
            autoComplete="new-password"
            value={pass}
            onChange={(event) => setPass(event.target.value)}
          />
        </label>
        <label className="sheet__field" htmlFor="fPass2">
          Repeat it
          <input
            id="fPass2"
            type="password"
            autoComplete="new-password"
            value={again}
            onChange={(event) => setAgain(event.target.value)}
          />
        </label>
      </div>
      <PlaceField id="fHome" label="Home base" archive={archive} value={home} onPick={setHome} />
      <BackupBox archive={archive} />
      <Acts>
        <ConfirmButton
          label="Reset archive to the demo"
          ask="Lose every change?"
          onConfirm={() => {
            void repository()
              ?.clear()
              .then(() => location.reload());
          }}
        />
        <button type="button" className="sheet__btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="sheet__btn is-main"
          disabled={problem !== null}
          onClick={submit}
        >
          Save
        </button>
      </Acts>
      <p className="sheet__note">{problem ?? 'The password is not stored anywhere yet.'}</p>
    </Sheet>
  );
}
