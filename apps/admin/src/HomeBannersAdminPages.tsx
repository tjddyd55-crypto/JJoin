import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { HomeBannerDto, UpsertHomeBannerRequest } from '@jjoin/types';

type ApiFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export function HomeBannersListPage({ api }: { api: ApiFn }) {
  const [items, setItems] = useState<HomeBannerDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    void api<HomeBannerDto[]>('/admin/home-banners')
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'load_failed'));
  }, [api]);

  return (
    <div>
      <h1>홈 배너</h1>
      <button type="button" onClick={() => navigate('/home-banners/new')}>
        새 배너
      </button>
      {error ? <p className="error-text">{error}</p> : null}
      <table className="data-table">
        <thead>
          <tr>
            <th>제목</th>
            <th>순서</th>
            <th>활성</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.title}</td>
              <td>{item.sortOrder}</td>
              <td>{item.active ? 'Y' : 'N'}</td>
              <td>
                <Link to={`/home-banners/${item.id}`}>편집</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HomeBannerEditPage({ api }: { api: ApiFn }) {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new' || !id;
  const navigate = useNavigate();
  const [form, setForm] = useState<UpsertHomeBannerRequest>({
    title: '',
    subtitle: '',
    imageUrl: '',
    href: '',
    sortOrder: 0,
    active: true,
    startsAt: null,
    endsAt: null,
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    void api<HomeBannerDto[]>('/admin/home-banners').then((rows) => {
      const found = rows.find((row) => row.id === id);
      if (!found) return;
      setForm({
        title: found.title,
        subtitle: found.subtitle,
        imageUrl: found.imageUrl,
        href: found.href,
        sortOrder: found.sortOrder,
        active: found.active,
        startsAt: found.startsAt,
        endsAt: found.endsAt,
      });
    });
  }, [api, id, isNew]);

  async function save() {
    const path = isNew ? '/admin/home-banners' : `/admin/home-banners/${id}`;
    await api<HomeBannerDto>(path, {
      method: isNew ? 'POST' : 'PUT',
      body: JSON.stringify(form),
    });
    navigate('/home-banners');
  }

  async function remove() {
    if (isNew || !id) return;
    await api(`/admin/home-banners/${id}`, { method: 'DELETE' });
    navigate('/home-banners');
  }

  return (
    <section className="card" style={{ padding: 16 }}>
      <h1>{isNew ? '배너 생성' : '배너 편집'}</h1>
      <label>
        제목
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        부제
        <input
          value={form.subtitle ?? ''}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
        />
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        이미지 URL
        <input
          value={form.imageUrl ?? ''}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
        />
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        링크
        <input value={form.href ?? ''} onChange={(e) => setForm({ ...form, href: e.target.value })} />
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        순서
        <input
          type="number"
          value={form.sortOrder ?? 0}
          onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
        />
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        <input
          type="checkbox"
          checked={form.active ?? true}
          onChange={(e) => setForm({ ...form, active: e.target.checked })}
        />{' '}
        활성
      </label>
      <div style={{ marginTop: 16 }}>
        <button type="button" onClick={() => void save()}>
          저장
        </button>
        {!isNew ? (
          <button type="button" onClick={() => void remove()}>
            삭제
          </button>
        ) : null}
      </div>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
