const paths = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  tickets: 'M4 4h16v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6V4z M12 8v2 M12 14v2',
  assets: 'M3 4h18v12H3z M8 21h8 M12 16v5',
  plus: 'M12 5v14 M5 12h14', arrow: 'M19 12H5 M11 6l-6 6 6 6',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  close: 'M6 6l12 12 M6 18L18 6', clock: 'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  check: 'M5 12l4 4L19 6', alert: 'M12 8v5 M12 17h.01 M12 3L2 21h20L12 3z',
} as const;
export function Icon({ name }: { name: keyof typeof paths }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
