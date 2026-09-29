import { useState } from 'react';
import type { World } from '@/app/boot';
import { addTrip, deleteTrip, freshId, updateTrip } from '@/data/edits';
import { MONTHS } from '@/lib/dates';
import { editArchive } from '@/state/owner';
import { ConfirmButton } from './ConfirmButton';
import { endpointOf, endpointOptions, endpointValue } from './endpoints';
import { Acts, Sheet } from './Sheet';

/** New or edit: a name, where it starts and ends, and the albums that belong to it. */
export function TripForm({
  world,
  id,
  albumIds,
  onClose,
}: {
  world: World;
  id: string | null;
  albumIds: string[];
  onClose: () => void;
}) {
  const { archive } = world;
  const trip = id ? (archive.trips.find((one) => one.id === id) ?? null) : null;
  const options = endpointOptions(archive, world.home);
  const [name, setName] = useState(trip?.name ?? '');
  const [start, setStart] = useState(endpointValue(trip?.start ?? { home: true }));
  const [end, setEnd] = useState(endpointValue(trip?.end ?? { home: true }));
  const [picked, setPicked] = useState<string[]>(trip ? [...trip.albumIds] : albumIds);
  const newest = [...archive.albums].reverse();

  const toggle = (albumId: string) =>
    setPicked(
      picked.includes(albumId) ? picked.filter((one) => one !== albumId) : [...picked, albumId],
    );

  const submit = () => {
    const fields = {
      name: name.trim(),
      start: endpointOf(start),
      end: endpointOf(end),
      albumIds: picked,
    };
    void editArchive((data) => {
      if (trip) updateTrip(data, trip.id, fields);
      else addTrip(data, freshId('t'), fields);
    }).then(onClose);
  };

  return (
    <Sheet
      title={trip ? 'Edit trip' : 'New trip'}
      lead="A name, where it starts and ends, and the albums that belong to it."
      onClose={onClose}
    >
      <label className="sheet__field" htmlFor="fName">
        Name
        <input
          id="fName"
          placeholder="Summer holiday 2023"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <div className="sheet__row">
        <label className="sheet__field" htmlFor="fStart">
          Starts from
          <select id="fStart" value={start} onChange={(event) => setStart(event.target.value)}>
            {options.map((one) => (
              <option key={one.value} value={one.value}>
                {one.label}
              </option>
            ))}
          </select>
        </label>
        <label className="sheet__field" htmlFor="fEnd">
          Ends at
          <select id="fEnd" value={end} onChange={(event) => setEnd(event.target.value)}>
            {options.map((one) => (
              <option key={one.value} value={one.value}>
                {one.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="sheet__field">
        Albums
        <div className="sheet__checks">
          {newest.map((album) => (
            <label key={album.id}>
              <input
                type="checkbox"
                checked={picked.includes(album.id)}
                onChange={() => toggle(album.id)}
              />
              <span>
                {album.title} · {album.city.name}
              </span>
              <small>
                {album.day} {MONTHS[album.month - 1]} {album.year}
              </small>
            </label>
          ))}
        </div>
      </div>
      <Acts>
        {trip && (
          <ConfirmButton
            label="Delete trip"
            ask="Delete this trip? Its albums stay."
            onConfirm={() => {
              void editArchive((data) => deleteTrip(data, trip.id)).then(onClose);
            }}
          />
        )}
        <button type="button" className="sheet__btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="sheet__btn is-main"
          disabled={!name.trim()}
          onClick={submit}
        >
          {trip ? 'Save' : 'Create trip'}
        </button>
      </Acts>
    </Sheet>
  );
}
