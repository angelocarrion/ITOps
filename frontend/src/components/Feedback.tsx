import type { ReactNode } from 'react';
export function Loading({ message = 'Loading tickets…' }: { message?: string }) {
  return <div className="state-panel" role="status"><span className="spinner" />{message}</div>;
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-panel" role="alert"><span>{message}</span>{retry && <button className="button secondary" onClick={retry}>Try again</button>}</div>;
}
export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return <div className="state-panel empty"><h3>{title}</h3><p>{message}</p>{action}</div>;
}
