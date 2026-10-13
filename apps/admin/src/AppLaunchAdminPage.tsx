import { useEffect, useState } from 'react';
import type { AdminAppLaunchSettingDto, UpdateAppLaunchSettingRequest } from '@jjoin/types';

type ApiFn = <T>(path: string, init?: RequestInit) => Promise<T>;

const DURATION_PRESETS = [
  { label: '1.0초', ms: 1000 },
  { label: '1.5초', ms: 1500 },
  { label: '2.0초', ms: 2000 },
  { label: '2.5초', ms: 2500 },
  { label: '3.0초', ms: 3000 },
];

export function AppLaunchAdminPage({ api }: { api: ApiFn }) {
  const [data, setData] = useState<AdminAppLaunchSettingDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setData(await api<AdminAppLaunchSettingDto>('/admin/app-launch'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(patch: UpdateAppLaunchSettingRequest) {
    setMessage(null);
    const next = await api<AdminAppLaunchSettingDto>('/admin/app-launch', {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
    setData(next);
    setMessage('저장되었습니다. 앱 cold start 시 반영됩니다.');
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    setMessage(null);
    const form = new FormData();
    form.append('file', file);
    const token = localStorage.getItem('jjoin_admin_token');
    const base = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';
    const res = await fetch(`${base}/admin/app-launch/image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    setData((await res.json()) as AdminAppLaunchSettingDto);
    setMessage('이미지가 업로드되었습니다.');
  }

  if (!data) return <div>{error ?? '불러오는 중…'}</div>;

  return (
    <div>
      <h1>앱 시작화면 관리</h1>
      {error ? <p className="error-text">{error}</p> : null}
      {message ? <p>{message}</p> : null}
      <p>
        <label>
          <input
            type="checkbox"
            checked={data.enabled}
            onChange={(e) => void save({ enabled: e.target.checked })}
          />{' '}
          시작화면 사용
        </label>
      </p>
      <p>노출 시간: {(data.displayDurationMs / 1000).toFixed(1)}초</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {DURATION_PRESETS.map((preset) => (
          <button
            key={preset.ms}
            type="button"
            onClick={() => void save({ displayDurationMs: preset.ms })}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <p>현재 이미지</p>
      {data.imageUrl ? (
        <img src={data.imageUrl} alt="launch preview" style={{ maxWidth: 280, borderRadius: 12 }} />
      ) : (
        <p>등록된 이미지 없음 (앱 embedded fallback 사용)</p>
      )}
      <p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => void onUpload(e.target.files?.[0] ?? null).catch((err) => setError(String(err)))}
        />
      </p>
      <p style={{ color: '#666', fontSize: 13 }}>
        Development API 기준. 앱은 최신 설정을 받아 로컬 캐시 후 다음 cold start에 반영합니다.
      </p>
    </div>
  );
}
