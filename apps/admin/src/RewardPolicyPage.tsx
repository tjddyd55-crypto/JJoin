import { useEffect, useState } from 'react';
import type { RewardMilestoneDto, RewardPolicyDto } from '@jjoin/types';

type ApiFn = <T>(path: string, init?: RequestInit) => Promise<T>;

function milestonesToText(rows: RewardMilestoneDto[]): string {
  return rows.map((row) => `${row.threshold}:${row.amount}`).join('\n');
}

function parseMilestones(text: string): RewardMilestoneDto[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [threshold, amount] = line.split(':');
      return { threshold: Number(threshold), amount: (amount ?? '').trim() };
    });
}

export function RewardPolicyPage({ api }: { api: ApiFn }) {
  const [draft, setDraft] = useState<RewardPolicyDto | null>(null);
  const [hostText, setHostText] = useState('');
  const [participationText, setParticipationText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api<RewardPolicyDto>('/admin/reward-policy').then((next) => {
      setDraft(next);
      setHostText(milestonesToText(next.hostMilestones));
      setParticipationText(milestonesToText(next.participationMilestones));
    });
  }, [api]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const next = await api<RewardPolicyDto>('/admin/reward-policy', {
        method: 'PUT',
        body: JSON.stringify({
          ...draft,
          hostMilestones: parseMilestones(hostText),
          participationMilestones: parseMilestones(participationText),
        }),
      });
      setDraft(next);
      setHostText(milestonesToText(next.hostMilestones));
      setParticipationText(milestonesToText(next.participationMilestones));
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
      <p>
        출석 날짜는 KST입니다. 호스트는 Join.status=COMPLETED, 참가는 role=PARTICIPANT +
        participationStatus=COMPLETED만 집계합니다. 동일 마일스톤은 1회만 지급됩니다.
      </p>
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
        호스트 마일스톤 (한 줄에 횟수:코인)
        <textarea
          rows={5}
          value={hostText}
          onChange={(e) => setHostText(e.target.value)}
          style={{ display: 'block', width: '100%', marginTop: 4 }}
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
        참가 마일스톤 (한 줄에 횟수:코인)
        <textarea
          rows={5}
          value={participationText}
          onChange={(e) => setParticipationText(e.target.value)}
          style={{ display: 'block', width: '100%', marginTop: 4 }}
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
