import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { CoinIssuanceDetailDto } from '@jjoin/types';
import { api } from '../lib/api';
import { formatCoin, formatDateTime } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import { AdminStatusBadge } from '../components/AdminStatusBadge';
import { renderLoadError } from '../components/renderLoadError';

export function CoinIssuanceDetailPage() {
  const { issuanceId } = useParams();
  const [detail, setDetail] = useState<CoinIssuanceDetailDto | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!issuanceId) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await api.getAdminCoinIssuance(issuanceId));
    } catch (e) {
      setError(e);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [issuanceId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error || !detail) {
    return renderLoadError(error ?? new Error('not_found'), () => void load());
  }

  return (
    <div>
      <Link to="/coin" className="back-link">
        ← 코인 관리
      </Link>
      <PageHeader title="발행 상세" description={detail.issuanceId} />
      <div className="section-card">
        <dl className="dl-grid">
          <dt>사용자</dt>
          <dd>
            <Link to={`/coin/users/${detail.userId}`}>
              {detail.userNickname ?? detail.userId}
            </Link>
          </dd>
          <dt>수량</dt>
          <dd>+{formatCoin(detail.amount)}</dd>
          <dt>유형</dt>
          <dd>{detail.issuanceType}</dd>
          <dt>사유</dt>
          <dd>{detail.reason ?? '—'}</dd>
          <dt>Reference</dt>
          <dd>
            {detail.referenceType ?? '—'} / {detail.referenceId ?? '—'}
          </dd>
          <dt>처리자</dt>
          <dd>
            {detail.createdByLabel} · {formatDateTime(detail.createdAt)}
          </dd>
          <dt>Ledger TX</dt>
          <dd className="mono">{detail.ledgerTxId}</dd>
          <dt>Status</dt>
          <dd>
            <AdminStatusBadge label={detail.status} tone="success" />
          </dd>
        </dl>
        {detail.metadata ? (
          <pre className="meta-block">{JSON.stringify(detail.metadata, null, 2)}</pre>
        ) : null}
      </div>
    </div>
  );
}
