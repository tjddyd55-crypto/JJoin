type ForbiddenStateProps = {
  title?: string;
  description?: string;
};

export function ForbiddenState({
  title = '접근 권한이 없습니다',
  description = '이 리소스에 대한 관리자 권한이 필요합니다.',
}: ForbiddenStateProps) {
  return (
    <div className="state-block">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
