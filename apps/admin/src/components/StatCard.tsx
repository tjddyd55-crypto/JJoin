type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'ok' | 'warn';
};

export function StatCard({ label, value, sub, tone = 'default' }: StatCardProps) {
  const toneClass = tone === 'default' ? '' : ` is-${tone}`;
  return (
    <div className={`stat-card${toneClass}`}>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {sub ? <div className="stat-card-sub">{sub}</div> : null}
    </div>
  );
}
