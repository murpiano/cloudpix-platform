import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import './forms.scss';

/** A modal sheet over everything. A press on the dim closes it; Esc is handled by `useKeys`. */
export function Sheet({
  title,
  lead,
  onClose,
  children,
}: {
  title: string;
  lead?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const heading = `sheet-${title.replace(/\W+/g, '-').toLowerCase()}`;

  // the first field takes the cursor, once the sheet has slid in
  useEffect(() => {
    const id = setTimeout(() => {
      sheet.current?.querySelector<HTMLElement>('input:not([type=file]), textarea')?.focus();
    }, 80);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      className="modal is-on"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sheet" ref={sheet} role="dialog" aria-modal="true" aria-labelledby={heading}>
        <h3 id={heading}>{title}</h3>
        {lead && <p className="sheet__lead">{lead}</p>}
        {children}
      </div>
    </div>
  );
}

export function Acts({ children }: { children: ReactNode }) {
  return <div className="sheet__acts">{children}</div>;
}
