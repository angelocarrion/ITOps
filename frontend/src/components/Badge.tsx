export function Badge({ value, kind }: { value: string; kind: 'status' | 'priority' }) {
  return <span className={`badge ${kind}-${value.toLowerCase().replaceAll(' ', '-')}`}><span className="badge-dot" />{value}</span>;
}
