import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JoinStatus, type AdminJoinListItemDto } from '@jjoin/types';
import { api } from '../lib/api';
import { useQueryState } from '../lib/useQueryState';
import { PageHeader } from '../components/PageHeader';
import { FilterBar } from '../components/FilterBar';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { Pagination } from '../components/Pagination';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { AdminStatusBadge } from '../components/AdminStatusBadge';
import { UserCell } from '../components/cells/UserCell';
import { DateTimeCell } from '../components/cells/DateTimeCell';
import { CoinAmountCell } from '../components/cells/CoinAmountCell';
import { renderLoadError } from '../components/renderLoadError';

const PAGE_SIZE = 20;

export function JoinsPage() {
  const navigate = useNavigate();
  const { q, qDraft, setQDraft, page, setPage, status, setStatus } = useQueryState();
  const [items, setItems] = useState<AdminJoinListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAdminJoins({
        q: q || undefined,
        status: status ? (status as JoinStatus) : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: DataTableColumn<AdminJoinListItemDto>[] = [
    {
      key: 'venue',
      header: '장소',
      render: (row) => row.venueName,
    },
    {
      key: 'host',
      header: '호스트',
      render: (row) => <UserCell nickname={row.hostNickname} userId={row.hostUserId} />,
    },
    {
      key: 'startAt',
      header: '시작',
      render: (row) => <DateTimeCell value={row.startAt} />,
    },
    {
      key: 'status',
      header: '상태',
      render: (row) => <AdminStatusBadge label={row.status} tone="info" />,
    },
    {
      key: 'players',
      header: '인원',
      render: (row) => `${row.confirmedPlayerCount}/${row.plannedPlayerCount}`,
    },
    {
      key: 'reward',
      header: '보상/인',
      render: (row) => <CoinAmountCell value={row.rewardPerParticipant} />,
    },
    {
      key: 'hold',
      header: 'Hold 합계',
      render: (row) => <CoinAmountCell value={row.rewardHoldTotalAmount} />,
    },
    {
      key: 'fee',
      header: '개설비',
      render: (row) => <CoinAmountCell value={row.roomCreationFeeAmount} />,
    },
    {
      key: 'disputes',
      header: '분쟁',
      render: (row) =>
        row.openDisputeCount > 0 ? (
          <AdminStatusBadge label={String(row.openDisputeCount)} tone="danger" />
        ) : (
          '0'
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="조인 관리" description="상태·검색 필터" />
      <FilterBar>
        <input
          className="filter-grow"
          placeholder="장소 / 호스트 / joinId"
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">전체 상태</option>
          {Object.values(JoinStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => void load()}>
          새로고침
        </button>
      </FilterBar>
      {loading ? <LoadingState /> : null}
      {!loading && error ? renderLoadError(error, () => void load()) : null}
      {!loading && !error ? (
        <>
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(r) => r.joinId}
            onRowClick={(r) => navigate(`/joins/${r.joinId}`)}
            empty={<EmptyState title="조인이 없습니다" />}
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </div>
  );
}
