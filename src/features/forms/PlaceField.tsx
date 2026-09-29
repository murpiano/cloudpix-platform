import { useState } from 'react';
import type { Archive } from '@/data/archive';
import { searchPlaces } from '@/data/places';
import type { PickedPlace } from '@/data/places';
import { placeLabel } from './fields';

/** A city field: the places already on the map first, then the built-in list. */
export function PlaceField({
  id,
  label,
  archive,
  value,
  onPick,
}: {
  id: string;
  label: string;
  archive: Archive;
  value: PickedPlace | null;
  onPick: (place: PickedPlace | null) => void;
}) {
  const [text, setText] = useState(value ? placeLabel(value) : '');
  const [open, setOpen] = useState(false);
  // a place that is already picked shows the whole list again, not a search for its own label
  const found = searchPlaces(archive, value && placeLabel(value) === text ? '' : text);

  const choose = (place: PickedPlace) => {
    setText(placeLabel(place));
    setOpen(false);
    onPick(place);
  };

  return (
    <label className="sheet__field" htmlFor={id}>
      {label}
      <input
        id={id}
        autoComplete="off"
        placeholder="Start typing a city"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          onPick(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          const first = found[0];
          if (event.key === 'Enter' && !value && first) {
            event.preventDefault();
            choose(first);
          }
        }}
      />
      {open && found.length > 0 && (
        <div className="sheet__sugg">
          {found.map((place) => (
            <button
              key={`${place.name}|${place.country}`}
              type="button"
              // pointerdown, not click: the field's blur would take the list away first
              onPointerDown={(event) => {
                event.preventDefault();
                choose(place);
              }}
            >
              {place.name}
              <small>
                {place.country}
                {place.cityKey ? ' · on your map' : ''}
              </small>
            </button>
          ))}
        </div>
      )}
    </label>
  );
}
