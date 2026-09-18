import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { StoreProfileDto, UpsertStoreProfileRequest } from '@jjoin/types';

type ApiFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export function StoreProfileEditPage({ api }: { api: ApiFn }) {
  const { ownershipId } = useParams<{ ownershipId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<UpsertStoreProfileRequest>({
    intro: '',
    vibe: '',
    amenities: [],
    screenBrand: 'OTHER',
    screenBrandOther: '',
    visibility: 'PUBLIC',
  });
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ownershipId) return;
    void api<StoreProfileDto>(`/admin/stores/${ownershipId}/profile`).then((row) => {
      setName(row.name);
      setForm({
        intro: row.intro,
        vibe: row.vibe,
        amenities: row.amenities,
        screenBrand: row.screenBrand,
        screenBrandOther: row.screenBrandOther,
        visibility: row.visibility,
      });
    });
  }, [api, ownershipId]);

  async function save() {
    if (!ownershipId) return;
    await api(`/admin/stores/${ownershipId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(form),
    });
    setMessage('저장했습니다.');
  }

  return (
    <section className="card" style={{ padding: 16 }}>
      <button type="button" onClick={() => navigate(`/stores/${ownershipId}`)}>
        ← 매장
      </button>
      <h1>매장 프로필 · {name}</h1>
      <label>
        소개
        <textarea
          value={form.intro ?? ''}
          onChange={(e) => setForm({ ...form, intro: e.target.value })}
        />
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        분위기
        <input value={form.vibe ?? ''} onChange={(e) => setForm({ ...form, vibe: e.target.value })} />
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        브랜드
        <select
          value={form.screenBrand}
          onChange={(e) => setForm({ ...form, screenBrand: e.target.value as never })}
        >
          <option value="GOLFZON">골프존</option>
          <option value="KAKAO_VX">카카오 VX</option>
          <option value="SG_GOLF">SG골프</option>
          <option value="OTHER">기타</option>
        </select>
      </label>
      {form.screenBrand === 'OTHER' ? (
        <label style={{ display: 'block', marginTop: 8 }}>
          기타 브랜드
          <input
            value={form.screenBrandOther ?? ''}
            onChange={(e) => setForm({ ...form, screenBrandOther: e.target.value })}
          />
        </label>
      ) : null}
      <label style={{ display: 'block', marginTop: 8 }}>
        공개
        <select
          value={form.visibility}
          onChange={(e) => setForm({ ...form, visibility: e.target.value as never })}
        >
          <option value="PUBLIC">공개</option>
          <option value="PRIVATE">비공개</option>
        </select>
      </label>
      <div style={{ marginTop: 16 }}>
        <button type="button" onClick={() => void save()}>
          저장
        </button>
      </div>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
