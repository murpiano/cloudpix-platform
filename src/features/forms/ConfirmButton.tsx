import { useEffect, useState } from 'react';

const BACK_MS = 3000;

/** A button for what cannot be undone: the first press asks, the second one does it. */
export function ConfirmButton({
  label,
  ask,
  onConfirm,
}: {
  label: string;
  ask: string;
  onConfirm: () => void;
}) {
  const [sure, setSure] = useState(false);

  useEffect(() => {
    if (!sure) return;
    const id = setTimeout(() => setSure(false), BACK_MS);
    return () => clearTimeout(id);
  }, [sure]);

  return (
    <button
      type="button"
      className={`sheet__btn is-danger${sure ? ' is-sure' : ''}`}
      onClick={() => (sure ? onConfirm() : setSure(true))}
    >
      {sure ? ask : label}
    </button>
  );
}
