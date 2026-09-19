import { useEffect, useState } from 'react';
import type { MessagePolicyDto } from '@jjoin/types';

type ApiFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export function MemberMessagePolicyPage({ api }: { api: ApiFn }) {
  const [draft, setDraft] = useState<MessagePolicyDto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api<MessagePolicyDto>('/admin/message-policy').then(setDraft);
  }, [api]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const next = await api<MessagePolicyDto>('/admin/message-policy', {
        method: 'PUT',
        body: JSON.stringify(draft),
      });
      setDraft(next);
      setMessage('저장했습니다. API가 최종 강제합니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setBusy(false);
    }
  }

  if (!draft) return <div>불러오는 중…</div>;

  return (
    <section className="card" style={{ padding: 16 }}>
      <h1>회원 메시지 정책</h1>
      <p>
        1:1 메시지 기본값은 전원 허용·무료입니다. 모바일은 미리보기만 하고, 거절은 API가
        최종 판정합니다. Production 푸시 실발송은 하지 않습니다.
      </p>
      <label style={{ display: 'block', marginBottom: 10 }}>
        <input
          type="checkbox"
          checked={draft.enabled}
          onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
        />{' '}
        메시지 ON
      </label>
      <label style={{ display: 'block', marginBottom: 10 }}>
        <input
          type="checkbox"
          checked={draft.premiumOnly}
          onChange={(e) => setDraft({ ...draft, premiumOnly: e.target.checked })}
        />{' '}
        프리미엄 회원만
      </label>
      <label style={{ display: 'block', marginBottom: 10 }}>
        <input
          type="checkbox"
          checked={draft.friendsOnly}
          onChange={(e) => setDraft({ ...draft, friendsOnly: e.target.checked })}
        />{' '}
        골프친구만
      </label>
      <label style={{ display: 'block', marginBottom: 10 }}>
        메시지 1건당 코인
        <input
          type="number"
          min={0}
          max={1000000}
          value={draft.coinCostPerMessage}
          onChange={(e) =>
            setDraft({ ...draft, coinCostPerMessage: Number(e.target.value) || 0 })
          }
        />
      </label>
      <p>0이면 차감하지 않습니다. 0보다 크면 전송 전에 잔액을 검사하고 원자적으로 차감합니다.</p>
      <button disabled={busy} onClick={() => void save()}>
        저장
      </button>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
