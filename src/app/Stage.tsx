import { useState } from 'react';
import { GlobeStage } from '@/features/globe/GlobeStage';
import { useKeys } from '@/features/keys/useKeys';
import { AlbumPanel } from '@/features/panel/AlbumPanel';
import { Timeline } from '@/features/timeline/Timeline';
import { appStore } from '@/state/app-state';
import { settingsStore } from '@/state/settings';
import { createDirector } from '@/tour/director';
import type { World } from './boot';
import { DirectorContext } from './director-context';

/** The main screen once the world is loaded: one director for the globe, the panel, the timeline. */
export function Stage({ world }: { world: World }) {
  const [director] = useState(() =>
    createDirector({
      archive: world.archive,
      home: world.home,
      store: appStore,
      pace: () => {
        const { photoSeconds, flightSeconds } = settingsStore.get();
        return { photoMs: photoSeconds * 1000, flightMs: flightSeconds * 1000 };
      },
    }),
  );
  useKeys(director);

  return (
    <DirectorContext value={director}>
      <GlobeStage world={world} director={director} />
      <AlbumPanel world={world} />
      <Timeline archive={world.archive} />
    </DirectorContext>
  );
}
