type Tone = 'neutral' | 'success' | 'danger' | 'accent' | 'info';

type AdminStatusBadgeProps = {
  label: string;
  tone?: Tone;
};

export function AdminStatusBadge({ label, tone = 'neutral' }: AdminStatusBadgeProps) {
  return <span className={`status-badge is-${tone}`}>{label}</span>;
}
