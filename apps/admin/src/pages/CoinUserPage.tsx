import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AdminUserCoinHistoryDto } from '@jjoin/types';
import { api } from '../lib/api';
import { formatCoin } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { DateTimeCell } from '../components/cells/DateTimeCell';
import { CoinAmountCell } from '../components/cells/CoinAmountCell';
import { renderLoadError } from '../components/renderLoadError';

export function CoinUserPage() {
  const { userId } = useParams();
  const [detail, setDetail] = useState<AdminUserCoinHistoryDto | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await api.getAdminUserCoinHistory(userId));
    } catch (e) {
      setError(e);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
      <PageHeader
        title="사용자 Coin"
        description={detail.nickname ?? detail.userId}
        actions={
          <Link to={`/members/${detail.userId}`}>
            <button type="button">회원 상세</button>
          </Link>
        }
      />
      <div className="section-card">
        <dl className="dl-grid">
          <dt>Available</dt>
          <dd>{formatCoin(detail.availableCoin)}</dd>
          <dt>Held</dt>
          <dd>{formatCoin(detail.heldCoin)}</dd>
          <dt>누적 발행 수령</dt>
          <dd>{formatCoin(detail.lifetimeIssuedReceived)} (신규 mint만)</dd>
          <dt>누적 Transfer 수령</dt>
          <dd>{formatCoin(detail.lifetimeTransferReceived)} (발행 아님)</dd>
          <dt>Burn 기여</dt>
          <dd>{formatCoin(detail.lifetimeBurnContributed)}</dd>
        </dl>
      </div>
      <div className="section-card">
        <h2>최근 Ledger</h2>
        <DataTable
          columns={[
            {
              key: 'at',
              header: '일시',
              render: (tx) => <DateTimeCell value={tx.createdAt} />,
            },
            { key: 'type', header: '유형', render: (tx) => tx.type },
            {
              key: 'amount',
              header: '금액',
              render: (tx) => <CoinAmountCell value={tx.amount} />,
            },
            { key: 'label', header: '라벨', render: (tx) => tx.label },
          ]}
          rows={detail.recentTransactions}
          rowKey={(tx) => tx.id}
          empty={<EmptyState title="거래 내역이 없습니다" />}
        />
      </div>
    </div>
  );
}
