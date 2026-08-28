import { shortId } from '../../lib/format';

type UserCellProps = {
  nickname: string | null | undefined;
  userId: string;
};

export function UserCell({ nickname, userId }: UserCellProps) {
  return (
    <div className="user-cell">
      <span className="user-cell-name">{nickname ?? '(닉네임 없음)'}</span>
      <span className="user-cell-id">{shortId(userId)}</span>
    </div>
  );
}
