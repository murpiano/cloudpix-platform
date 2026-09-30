import type { World } from '@/app/boot';
import { appStore } from '@/state/app-state';
import { closeForm } from '@/state/layers';
import { useStore } from '@/state/store';
import { AboutForm } from './AboutForm';
import { AccountForm } from './AccountForm';
import { AlbumForm } from './AlbumForm';
import { backend } from '@/backend/session';
import { LoginForm } from './LoginForm';
import { RemoteLoginForm } from './RemoteLoginForm';
import { PhotoForm } from './PhotoForm';
import { TripForm } from './TripForm';

const close = () => closeForm(appStore);

/** The one form that is open, if any. */
export function Forms({ world }: { world: World }) {
  const form = useStore(appStore, (state) => state.form);
  if (!form) return null;
  switch (form.kind) {
    case 'login':
      return backend() ? (
        <RemoteLoginForm archive={world.archive} why={form.why} onClose={close} />
      ) : (
        <LoginForm archive={world.archive} why={form.why} onClose={close} />
      );
    case 'account':
      return <AccountForm archive={world.archive} onClose={close} />;
    case 'about':
      return <AboutForm onClose={close} />;
    case 'trip':
      return <TripForm world={world} id={form.id} albumIds={form.albumIds} onClose={close} />;
    case 'album':
      return (
        <AlbumForm
          world={world}
          id={form.id}
          cityKey={form.cityKey}
          tripId={form.tripId}
          onClose={close}
        />
      );
    case 'photo':
      return (
        <PhotoForm world={world} albumId={form.albumId} photoKey={form.photoKey} onClose={close} />
      );
  }
}
