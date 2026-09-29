import { useState } from 'react';
import type { World } from '@/app/boot';
import { removePhoto, setCaption } from '@/data/edits';
import { photoUrl } from '@/data/photos';
import { photoKey, photoNote } from '@/data/social';
import { editArchive } from '@/state/owner';
import { ConfirmButton } from './ConfirmButton';
import { Acts, Sheet } from './Sheet';

/** One photo: its own line, or away with it. */
export function PhotoForm({
  world,
  albumId,
  photoKey: key,
  onClose,
}: {
  world: World;
  albumId: string;
  photoKey: string;
  onClose: () => void;
}) {
  const album = world.archive.albumById.get(albumId);
  const photo = album?.photos.find((one) => photoKey(one) === key);
  const [caption, setText] = useState(photo?.caption ?? '');
  if (!photo) return null;
  const url = photoUrl(photo);

  return (
    <Sheet title="Edit photo" onClose={onClose}>
      {url && <img className="sheet__pic" src={url} alt="" />}
      <label className="sheet__field" htmlFor="fCap">
        Caption
        <textarea
          id="fCap"
          placeholder={photoNote(photo)}
          value={caption}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <Acts>
        <ConfirmButton
          label="Delete photo"
          ask="Delete it from the album?"
          onConfirm={() => {
            void editArchive(async (data, repo) => {
              const gone = removePhoto(data, albumId, key);
              if (gone) await repo.dropPhotos([gone]);
            }).then(onClose);
          }}
        />
        <button type="button" className="sheet__btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="sheet__btn is-main"
          onClick={() => {
            void editArchive((data) => setCaption(data, albumId, key, caption)).then(onClose);
          }}
        >
          Save
        </button>
      </Acts>
    </Sheet>
  );
}
