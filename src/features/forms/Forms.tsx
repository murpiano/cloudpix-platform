import type { World } from '@/app/boot';
import { appStore } from '@/state/app-state';
import { closeForm } from '@/state/layers';
import { useStore } from '@/state/store';
import { AccountForm } from './AccountForm';
import { LoginForm } from './LoginForm';

const close = () => closeForm(appStore);

/** The one form that is open, if any. */
export function Forms({ world }: { world: World }) {
  const form = useStore(appStore, (state) => state.form);
  if (!form) return null;
  switch (form.kind) {
    case 'login':
      return <LoginForm archive={world.archive} why={form.why} onClose={close} />;
    case 'account':
      return <AccountForm archive={world.archive} onClose={close} />;
    default:
      // the trip, album and photo sheets arrive in the next task
      return null;
  }
}
