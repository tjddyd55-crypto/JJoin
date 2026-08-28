import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DisputeStatus, type AdminDisputeListItemDto } from '@jjoin/types';
import { api } from '../lib/api';
import { useQueryState } from '../lib/useQueryState';
import { PageHeader } from '../components/PageHeader';
import { FilterBar } from '../components/FilterBar';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { AdminStatusBadge } from '../components/AdminStatusBadge';
import { DateTimeCell } from '../components/cells/DateTimeCell';
import { CoinAmountCell } from '../components/cells/CoinAmountCell';
import { renderLoadError } from '../components/renderLoadError';

const STATUS_ALL = 'ALL';

function disputeTone(status: DisputeStatus): 'danger' | 'accent' | 'success' | 'neutral' {
  if (status === DisputeStatus.OPEN) return 'danger';
  if (status === DisputeStatus.UNDER_REVIEW) return 'accent';
  if (status === DisputeStatus.RESOLVED) return 'success';
  return 'neutral';
}

export function DisputesPage() {
  const navigate = useNavigate();
  const { status, setStatus } = useQueryState();
  const [items, setItems] = useState<AdminDisputeListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  /** Default OPEN when param absent; ALL is explicit. */
  const statusFilter = status === '' ? DisputeStatus.OPEN : status;
  const apiStatus =
    statusFilter === STATUS_ALL ? undefined : (statusFilter as DisputeStatus);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAdminDisputes({
        status: apiStatus,
        limit: 50,
      });
      setItems(res.items);
    } catch (e) {
      setError(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [apiStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: DataTableColumn<AdminDisputeListItemDto>[] = [
    { key: 'venue', header: '장소', render: (r) => r.venueName },
    { key: 'host', header: '호스트', render: (r) => r.hostNickname },
    { key: 'participant', header: '참가자', render: (r) => r.participantNickname },
    {
      key: 'reward',
      header: '보상',
      render: (r) => <CoinAmountCell value={r.rewardAmount} />,
    },
    { key: 'reason', header: '사유', render: (r) => r.reasonType },
    {
      key: 'status',
      header: '상태',
      render: (r) => <AdminStatusBadge label={r.status} tone={disputeTone(r.status)} />,
    },
    {
      key: 'opened',
      header: '접수',
      render: (r) => <DateTimeCell value={r.openedAt} />,
    },
  ];

  return (
    <div>
      <PageHeader title="분쟁 / 신고" />
      <FilterBar>
        <select
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value={STATUS_ALL}>ALL</option>
          <option value={DisputeStatus.OPEN}>OPEN</option>
          <option value={DisputeStatus.UNDER_REVIEW}>UNDER_REVIEW</option>
          <option value={DisputeStatus.RESOLVED}>RESOLVED</option>
        </select>
        <button type="button" onClick={() => void load()}>
          새로고침
        </button>
      </FilterBar>
      {loading ? <LoadingState /> : null}
      {!loading && error ? renderLoadError(error, () => void load()) : null}
      {!loading && !error ? (
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(r) => r.disputeId}
          onRowClick={(r) => navigate(`/disputes/${r.disputeId}`)}
          empty={<EmptyState title="분쟁이 없습니다" />}
        />
      ) : null}
    </div>
  );
}
