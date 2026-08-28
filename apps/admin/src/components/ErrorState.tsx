type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = '오류가 발생했습니다',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="state-block">
      <h3>{title}</h3>
      <p className="text-danger">{message}</p>
      {onRetry ? (
        <div className="state-actions">
          <button type="button" onClick={onRetry}>
            다시 시도
          </button>
        </div>
      ) : null}
    </div>
  );
}
