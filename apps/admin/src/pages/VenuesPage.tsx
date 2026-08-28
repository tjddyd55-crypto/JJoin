import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AdminVenueListItemDto } from '@jjoin/types';
import { api } from '../lib/api';
import { useQueryState } from '../lib/useQueryState';
import { PageHeader } from '../components/PageHeader';
import { FilterBar } from '../components/FilterBar';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { Pagination } from '../components/Pagination';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { DateTimeCell } from '../components/cells/DateTimeCell';
import { renderLoadError } from '../components/renderLoadError';

const PAGE_SIZE = 20;

export function VenuesPage() {
  const navigate = useNavigate();
  const { q, qDraft, setQDraft, page, setPage } = useQueryState();
  const [items, setItems] = useState<AdminVenueListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAdminVenues({ q: q || undefined, page, pageSize: PAGE_SIZE });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: DataTableColumn<AdminVenueListItemDto>[] = [
    { key: 'name', header: '이름', render: (r) => r.name },
    { key: 'provider', header: 'Provider', render: (r) => r.provider },
    {
      key: 'placeId',
      header: 'Kakao Place ID',
      className: 'mono',
      render: (r) => r.providerPlaceId,
    },
    { key: 'region', header: '지역', render: (r) => r.region ?? '—' },
    { key: 'address', header: '주소', render: (r) => r.address ?? '—' },
    {
      key: 'joins',
      header: '조인',
      render: (r) => `${r.openJoinCount} open / ${r.joinCount}`,
    },
    {
      key: 'created',
      header: '등록',
      render: (r) => <DateTimeCell value={r.createdAt} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="장소 / 매장"
        description="JJOIN 소유 장소 · providerPlaceId는 Kakao 참조"
      />
      <FilterBar>
        <input
          className="filter-grow"
          placeholder="이름 / 주소 / placeId"
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
        />
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
            rowKey={(r) => r.venueId}
            onRowClick={(r) => navigate(`/venues/${r.venueId}`)}
            empty={<EmptyState title="장소가 없습니다" />}
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
