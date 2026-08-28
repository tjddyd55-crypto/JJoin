import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AdminJoinDetailDto } from '@jjoin/types';
import { api } from '../lib/api';
import { formatCoin, formatDateTime, shortId } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import { AdminStatusBadge } from '../components/AdminStatusBadge';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { UserCell } from '../components/cells/UserCell';
import { CoinAmountCell } from '../components/cells/CoinAmountCell';
import { DateTimeCell } from '../components/cells/DateTimeCell';
import { renderLoadError } from '../components/renderLoadError';

export function JoinDetailPage() {
  const { joinId } = useParams();
  const [data, setData] = useState<AdminJoinDetailDto | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!joinId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api.getAdminJoin(joinId));
    } catch (e) {
      setError(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [joinId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error || !data) return renderLoadError(error ?? new Error('not_found'), () => void load());

  const participantColumns: DataTableColumn<AdminJoinDetailDto['participants'][number]>[] = [
    {
      key: 'user',
      header: '참가자',
      render: (row) => <UserCell nickname={row.nickname} userId={row.userId} />,
    },
    { key: 'role', header: '역할', render: (row) => row.role },
    {
      key: 'participation',
      header: '참가 상태',
      render: (row) => <AdminStatusBadge label={row.participationStatus} />,
    },
    {
      key: 'rewardStatus',
      header: '보상 상태',
      render: (row) => row.rewardStatus ?? '—',
    },
    {
      key: 'rewardAmount',
      header: '보상',
      render: (row) => <CoinAmountCell value={row.rewardAmount} />,
    },
  ];

  return (
    <div>
      <Link to="/joins" className="back-link">
        ← 조인 목록
      </Link>
      <PageHeader
        title={data.title ?? data.venue.name}
        description={`${shortId(data.joinId, 12)} · 읽기 전용`}
      />

      <div className="section-card">
        <h2>요약</h2>
        <dl className="dl-grid">
          <dt>상태</dt>
          <dd>
            <AdminStatusBadge label={data.status} tone="info" />
          </dd>
          <dt>시작</dt>
          <dd>{formatDateTime(data.startAt)}</dd>
          <dt>종료 예정</dt>
          <dd>{formatDateTime(data.scheduledEndAt)}</dd>
          <dt>인원</dt>
          <dd>
            {data.confirmedPlayerCount}/{data.plannedPlayerCount}
          </dd>
          <dt>보상/인</dt>
          <dd>{formatCoin(data.rewardPerParticipant)}</dd>
          <dt>Hold 합계</dt>
          <dd>{formatCoin(data.rewardHoldTotalAmount)}</dd>
          <dt>개설비</dt>
          <dd>{formatCoin(data.roomCreationFeeAmount)}</dd>
          <dt>설명</dt>
          <dd>{data.description ?? '—'}</dd>
        </dl>
      </div>

      <div className="section-card">
        <h2>호스트</h2>
        <UserCell nickname={data.host.nickname} userId={data.host.userId} />
      </div>

      <div className="section-card">
        <h2>장소</h2>
        <dl className="dl-grid">
          <dt>이름</dt>
          <dd>
            <Link to={`/venues/${data.venue.venueId}`}>{data.venue.name}</Link>
          </dd>
          <dt>주소</dt>
          <dd>{data.venue.address ?? '—'}</dd>
          <dt>Provider</dt>
          <dd>{data.venue.provider}</dd>
        </dl>
      </div>

      <div className="section-card">
        <h2>참가자</h2>
        <DataTable
          columns={participantColumns}
          rows={data.participants}
          rowKey={(r) => r.participantId}
          empty={<EmptyState title="참가자가 없습니다" />}
        />
      </div>

      <div className="section-card">
        <h2>Holds</h2>
        <DataTable
          columns={[
            { key: 'id', header: 'Hold ID', render: (r) => shortId(r.holdId) },
            {
              key: 'status',
              header: '상태',
              render: (r) => <AdminStatusBadge label={r.status} />,
            },
            {
              key: 'amount',
              header: '금액',
              render: (r) => <CoinAmountCell value={r.amount} />,
            },
          ]}
          rows={data.holds}
          rowKey={(r) => r.holdId}
          empty={<EmptyState title="Hold가 없습니다" />}
        />
      </div>

      <div className="section-card">
        <h2>분쟁</h2>
        <DataTable
          columns={[
            {
              key: 'id',
              header: '분쟁',
              render: (r) => <Link to={`/disputes/${r.disputeId}`}>{shortId(r.disputeId)}</Link>,
            },
            {
              key: 'status',
              header: '상태',
              render: (r) => <AdminStatusBadge label={r.status} tone="danger" />,
            },
            { key: 'reason', header: '사유', render: (r) => r.reasonType },
            {
              key: 'opened',
              header: '접수',
              render: (r) => <DateTimeCell value={r.openedAt} />,
            },
          ]}
          rows={data.disputes}
          rowKey={(r) => r.disputeId}
          empty={<EmptyState title="분쟁이 없습니다" />}
        />
      </div>
    </div>
  );
}
