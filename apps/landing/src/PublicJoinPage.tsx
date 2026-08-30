import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { PublicJoinShareDto } from '@jjoin/types';

const API_URL = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '');

function formatStart(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  } catch {
    return iso;
  }
}

export function PublicJoinPage() {
  const { shareSlug } = useParams<{ shareSlug: string }>();
  const [data, setData] = useState<PublicJoinShareDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shareSlug) {
      setError('잘못된 공유 링크입니다.');
      setLoading(false);
      return;
    }
    if (!API_URL) {
      setError('API 주소가 설정되지 않았습니다.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(`${API_URL}/public/joins/${encodeURIComponent(shareSlug)}`);
        if (!res.ok) {
          throw new Error(`api_error:${res.status}`);
        }
        const json = (await res.json()) as PublicJoinShareDto;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError('조인 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shareSlug]);

  return (
    <div className="page public-join-page">
      <header className="topbar">
        <p className="brand">
          <Link to="/" className="brand-link">
            JJOINZONE
          </Link>
        </p>
      </header>

      <main className="public-join-main">
        {loading ? <p className="public-join-muted">불러오는 중…</p> : null}
        {error ? <p className="public-join-error">{error}</p> : null}

        {data ? (
          <article className="public-join-card" aria-labelledby="public-join-title">
            <p className="public-join-eyebrow">공개 조인</p>
            <h1 id="public-join-title" className="public-join-title">
              {data.title?.trim() || data.venueName}
            </h1>
            <p className="public-join-venue">{data.venueName}</p>
            {data.regionLabel ? (
              <p className="public-join-muted">{data.regionLabel}</p>
            ) : null}

            <dl className="public-join-meta">
              <div>
                <dt>시작</dt>
                <dd>{formatStart(data.startAt)}</dd>
              </div>
              <div>
                <dt>인원</dt>
                <dd>
                  {data.confirmedPlayerCount}/{data.plannedPlayerCount}명
                  {data.availableSlots > 0 ? ` · 남은 자리 ${data.availableSlots}` : ''}
                </dd>
              </div>
              <div>
                <dt>상태</dt>
                <dd>{data.statusLabel || data.status}</dd>
              </div>
            </dl>

            {data.description ? (
              <p className="public-join-desc">{data.description}</p>
            ) : null}

            <div className="public-join-cta">
              <a className="btn btn-primary" href={data.appDeepLink}>
                앱에서 보기
              </a>
              {!data.isJoinable ? (
                <p className="public-join-muted">현재는 참가할 수 없는 조인입니다.</p>
              ) : (
                <p className="public-join-muted">앱에서 바로 참가할 수 있습니다.</p>
              )}
            </div>
          </article>
        ) : null}
      </main>
    </div>
  );
}
