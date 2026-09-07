import { useEffect, useState } from 'react';
import type {
  AdminMobileAndroidReleaseDto,
  UpdateMobileAndroidReleaseRequest,
} from '@jjoin/types';

type ApiFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export function MobileAndroidReleasePage({ api }: { api: ApiFn }) {
  const [settings, setSettings] = useState<AdminMobileAndroidReleaseDto | null>(null);
  const [form, setForm] = useState<UpdateMobileAndroidReleaseRequest>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void api<AdminMobileAndroidReleaseDto>('/admin/mobile-release/android')
      .then((data) => {
        setSettings(data);
        setForm({
          latestVersionCode: data.latestVersionCode,
          latestVersionName: data.latestVersionName,
          apkUrl: data.apkUrl,
          releaseNotes: data.releaseNotes,
        });
      })
      .catch(() => setError('앱 버전 정보를 불러오지 못했습니다.'));
  }, [api]);

  async function onSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await api<AdminMobileAndroidReleaseDto>('/admin/mobile-release/android', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setSettings(updated);
      setMessage('저장되었습니다.');
    } catch {
      setError('저장하지 못했습니다. 입력값을 확인해주세요.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1>앱 버전 관리</h1>
      <p>Android 운영 앱 최신 버전과 APK 다운로드 URL을 관리합니다.</p>
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      {message ? <p style={{ color: 'green' }}>{message}</p> : null}

      <section className="card" style={{ padding: 16, marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          최신 버전 (versionName)
          <input
            style={{ display: 'block', width: '100%', marginTop: 4 }}
            value={form.latestVersionName ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, latestVersionName: e.target.value }))}
            placeholder="0.0.7"
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          버전 코드 (versionCode)
          <input
            style={{ display: 'block', width: '100%', marginTop: 4 }}
            type="number"
            min={0}
            value={form.latestVersionCode ?? 0}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                latestVersionCode: Number.parseInt(e.target.value, 10) || 0,
              }))
            }
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          APK 다운로드 (HTTPS)
          <input
            style={{ display: 'block', width: '100%', marginTop: 4 }}
            value={form.apkUrl ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, apkUrl: e.target.value }))}
            placeholder="https://..."
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          업데이트 내용
          <textarea
            style={{ display: 'block', width: '100%', marginTop: 4, minHeight: 120 }}
            value={form.releaseNotes ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, releaseNotes: e.target.value }))}
          />
        </label>
        <button type="button" disabled={saving} onClick={() => void onSave()}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </section>

      {settings ? (
        <section className="card" style={{ padding: 16 }}>
          <p>마지막 수정: {new Date(settings.updatedAt).toLocaleString('ko-KR')}</p>
          {settings.publishedAt ? (
            <p>게시: {new Date(settings.publishedAt).toLocaleString('ko-KR')}</p>
          ) : (
            <p>아직 게시된 릴리스가 없습니다.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
