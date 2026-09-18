import { useEffect, useState } from 'react';
import type { FeatureFlagDto } from '@jjoin/types';

type ApiFn = <T>(path: string, init?: RequestInit) => Promise<T>;

const LABELS: Array<{ key: keyof FeatureFlagDto; label: string }> = [
  { key: 'clubsUiEnabled', label: '동호회 사용자 UI' },
  { key: 'profileMatchAlertsEnabled', label: '프로필 매칭 알림' },
  { key: 'storeProfilesEnabled', label: '스크린 매장 프로필' },
  { key: 'homeBannersEnabled', label: '홈 배너' },
  { key: 'storeBannerAdsEnabled', label: '매장 배너 광고' },
  { key: 'coinGiftEnabled', label: '코인 선물' },
  { key: 'attendanceRewardsEnabled', label: '출석·업적 보상' },
];

export function FeatureFlagsPage({ api }: { api: ApiFn }) {
  const [flags, setFlags] = useState<FeatureFlagDto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api<FeatureFlagDto>('/admin/feature-flags').then(setFlags);
  }, [api]);

  async function save() {
    if (!flags) return;
    setBusy(true);
    try {
      const next = await api<FeatureFlagDto>('/admin/feature-flags', {
        method: 'PUT',
        body: JSON.stringify(flags),
      });
      setFlags(next);
      setMessage('저장했습니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setBusy(false);
    }
  }

  if (!flags) return <div>불러오는 중…</div>;

  return (
    <section className="card" style={{ padding: 16 }}>
      <h1>기능 플래그</h1>
      <p>동호회 데이터/API는 유지하고 사용자 UI만 끕니다. 기본값은 동호회 UI OFF입니다.</p>
      {LABELS.map((item) => (
        <label key={item.key} style={{ display: 'block', marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={flags[item.key]}
            onChange={(e) => setFlags({ ...flags, [item.key]: e.target.checked })}
          />{' '}
          {item.label}
        </label>
      ))}
      <button disabled={busy} onClick={() => void save()}>
        저장
      </button>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
