type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = '불러오는 중…' }: LoadingStateProps) {
  return (
    <div className="state-block">
      <h3>{label}</h3>
    </div>
  );
}
