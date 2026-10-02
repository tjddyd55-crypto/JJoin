import { useEffect, useState } from 'react';
import type { JoinSessionReviewDto } from '@jjoin/types';

type ApiFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export function JoinSessionReviewsAdminPage({ api }: { api: ApiFn }) {
  const [rows, setRows] = useState<JoinSessionReviewDto[]>([]);
  const [selected, setSelected] = useState<JoinSessionReviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setRows(await api<JoinSessionReviewDto[]>('/admin/join-session-reviews?limit=100'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(reviewId: string) {
    if (!window.confirm('이 후기를 삭제할까요?')) return;
    await api<void>(`/admin/join-session-reviews/${reviewId}`, { method: 'DELETE' });
    setSelected(null);
    await load();
  }

  return (
    <div>
      <h1>쪼인 후기 관리</h1>
      {error ? <p className="error-text">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>쪼인 ID</th>
            <th>작성자</th>
            <th>제목</th>
            <th>작성일</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.reviewId}>
              <td>{row.joinId}</td>
              <td>{row.authorNickname}</td>
              <td>{row.title}</td>
              <td>{row.createdAt.slice(0, 10)}</td>
              <td>
                <button type="button" onClick={() => setSelected(row)}>
                  상세
                </button>
                <button type="button" onClick={() => void remove(row.reviewId)}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected ? (
        <div style={{ marginTop: 24 }}>
          <h2>{selected.title}</h2>
          <p>{selected.content}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {selected.photos.map((p) => (
              <img key={p.photoId} src={p.imageUrl} alt="" width={120} height={120} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
