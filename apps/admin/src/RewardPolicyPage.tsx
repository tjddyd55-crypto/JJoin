import { useEffect, useState } from 'react';
import type { RewardPolicyDto } from '@jjoin/types';

type ApiFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export function RewardPolicyPage({ api }: { api: ApiFn }) {
  const [draft, setDraft] = useState<RewardPolicyDto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api<RewardPolicyDto>('/admin/reward-policy').then(setDraft);
  }, [api]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const next = await api<RewardPolicyDto>('/admin/reward-policy', {
        method: 'PUT',
        body: JSON.stringify(draft),
      });
      setDraft(next);
      setMessage('저장했습니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setBusy(false);
    }
  }

  if (!draft) return <div>불러오는 중…</div>;

  return (
    <section className="card" style={{ padding: 16 }}>
      <h1>보상 정책</h1>
      <p>성공 기준은 참가/조인 COMPLETED입니다. 동일 마일스톤은 1회만 지급됩니다.</p>
      <label>
        <input
          type="checkbox"
          checked={draft.attendanceEnabled}
          onChange={(e) => setDraft({ ...draft, attendanceEnabled: e.target.checked })}
        />{' '}
        출석 보상
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        출석 금액
        <input
          value={draft.attendanceAmount}
          onChange={(e) => setDraft({ ...draft, attendanceAmount: e.target.value })}
        />
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        <input
          type="checkbox"
          checked={draft.hostEnabled}
          onChange={(e) => setDraft({ ...draft, hostEnabled: e.target.checked })}
        />{' '}
        호스트 업적
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        호스트 임계값
        <input
          type="number"
          value={draft.hostThreshold}
          onChange={(e) => setDraft({ ...draft, hostThreshold: Number(e.target.value) })}
        />
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        호스트 금액
        <input
          value={draft.hostAmount}
          onChange={(e) => setDraft({ ...draft, hostAmount: e.target.value })}
        />
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        <input
          type="checkbox"
          checked={draft.participationEnabled}
          onChange={(e) => setDraft({ ...draft, participationEnabled: e.target.checked })}
        />{' '}
        참가 업적
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        참가 임계값
        <input
          type="number"
          value={draft.participationThreshold}
          onChange={(e) => setDraft({ ...draft, participationThreshold: Number(e.target.value) })}
        />
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        참가 금액
        <input
          value={draft.participationAmount}
          onChange={(e) => setDraft({ ...draft, participationAmount: e.target.value })}
        />
      </label>
      <div style={{ marginTop: 16 }}>
        <button disabled={busy} onClick={() => void save()}>
          저장
        </button>
      </div>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
