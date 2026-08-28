type EmptyStateProps = {
  title?: string;
  description?: string;
};

export function EmptyState({
  title = '표시할 항목이 없습니다',
  description,
}: EmptyStateProps) {
  return (
    <div className="state-block">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
