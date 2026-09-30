import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
export function Modal({ title, children, busy, onClose }: { title: string; children: ReactNode; busy: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="modal-heading"><div><span className="eyebrow">SERVICE REQUEST</span><h2 id="modal-title">{title}</h2></div><button className="icon-button" type="button" aria-label="Close new ticket form" onClick={onClose} disabled={busy}><Icon name="close" /></button></div>{children}
  </dialog>;
}
