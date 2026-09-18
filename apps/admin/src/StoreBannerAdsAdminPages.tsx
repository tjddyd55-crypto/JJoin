import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { StoreBannerAdRequestDto } from '@jjoin/types';

type ApiFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export function StoreBannerAdsListPage({ api }: { api: ApiFn }) {
  const [items, setItems] = useState<StoreBannerAdRequestDto[]>([]);
  useEffect(() => {
    void api<StoreBannerAdRequestDto[]>('/admin/store-banner-ads').then(setItems);
  }, [api]);
  return (
    <div>
      <h1>매장 배너 광고</h1>
      <table className="data-table">
        <thead>
          <tr>
            <th>매장</th>
            <th>제목</th>
            <th>상태</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.storeName}</td>
              <td>{item.title}</td>
              <td>{item.status}</td>
              <td>
                <Link to={`/store-banner-ads/${item.id}`}>심사</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StoreBannerAdDetailPage({ api }: { api: ApiFn }) {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<StoreBannerAdRequestDto | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    const rows = await api<StoreBannerAdRequestDto[]>('/admin/store-banner-ads');
    const found = rows.find((row) => row.id === id) ?? null;
    setItem(found);
    if (found?.startsAt) setStartsAt(found.startsAt.slice(0, 16));
    if (found?.endsAt) setEndsAt(found.endsAt.slice(0, 16));
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, id]);

  async function review(action: 'APPROVE' | 'REJECT') {
    if (!id) return;
    const next = await api<StoreBannerAdRequestDto>(`/admin/store-banner-ads/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, adminNote: adminNote || null }),
    });
    setItem(next);
    setMessage(`${action} 완료`);
  }

  async function schedule() {
    if (!id) return;
    const next = await api<StoreBannerAdRequestDto>(`/admin/store-banner-ads/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify({
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      }),
    });
    setItem(next);
    setMessage('일정 등록 완료');
  }

  if (!item) return <div>불러오는 중…</div>;

  return (
    <section className="card" style={{ padding: 16 }}>
      <h1>{item.title}</h1>
      <p>
        {item.storeName} · {item.status}
      </p>
      <p>{item.subtitle}</p>
      <p>{item.memo}</p>
      <label>
        관리자 메모
        <input value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
      </label>
      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={() => void review('APPROVE')}>
          승인
        </button>
        <button type="button" onClick={() => void review('REJECT')}>
          거절
        </button>
      </div>
      <h3>일정</h3>
      <label>
        시작
        <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        종료
        <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
      </label>
      <button type="button" onClick={() => void schedule()}>
        일정 저장
      </button>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
