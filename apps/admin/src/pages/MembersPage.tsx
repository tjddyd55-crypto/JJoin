import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AdminMemberListItemDto } from '@jjoin/types';
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
import { MembershipPlanBadge } from '../components/MembershipPlanBadge';
import { renderLoadError } from '../components/renderLoadError';

const PAGE_SIZE = 20;

function identityTone(status: string): 'success' | 'accent' | 'danger' | 'neutral' {
  if (status === 'VERIFIED') return 'success';
  if (status === 'PENDING') return 'accent';
  if (status === 'FAILED') return 'danger';
  return 'neutral';
}

export function MembersPage() {
  const navigate = useNavigate();
  const { q, qDraft, setQDraft, page, setPage } = useQueryState();
  const [items, setItems] = useState<AdminMemberListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAdminMembers({ q: q || undefined, page, pageSize: PAGE_SIZE });
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

  const columns: DataTableColumn<AdminMemberListItemDto>[] = [
    {
      key: 'user',
      header: '닉네임',
      render: (row) => <UserCell nickname={row.nickname} userId={row.userId} />,
    },
    {
      key: 'createdAt',
      header: '가입일',
      render: (row) => <DateTimeCell value={row.createdAt} />,
    },
    {
      key: 'providers',
      header: '소셜',
      render: (row) => (
        <div className="chip-row">
          {row.socialProviders.map((p) => (
            <span key={p} className="chip">
              {p}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'membership',
      header: '멤버십',
      render: (row) => (
        <div className="chip-row">
          <MembershipPlanBadge planCode={row.membershipPlanCode} />
          {row.membershipPlanCode === 'PREMIUM' && row.membershipCancelAtPeriodEnd ? (
            <span className="chip">해지 예정</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'identity',
      header: '본인인증',
      render: (row) => (
        <AdminStatusBadge label={row.identityStatus} tone={identityTone(row.identityStatus)} />
      ),
    },
    {
      key: 'account',
      header: '계정',
      render: (row) => <AdminStatusBadge label={row.accountStatus} />,
    },
    {
      key: 'available',
      header: 'Available',
      render: (row) => <CoinAmountCell value={row.availableCoin} />,
    },
    {
      key: 'held',
      header: 'Held',
      render: (row) => <CoinAmountCell value={row.heldCoin} />,
    },
  ];

  return (
    <div>
      <PageHeader title="회원 관리" description="닉네임 / userId 검색" />
      <FilterBar>
        <input
          className="filter-grow"
          placeholder="닉네임 또는 userId"
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
            rowKey={(r) => r.userId}
            onRowClick={(r) => navigate(`/members/${r.userId}`)}
            empty={<EmptyState title="회원이 없습니다" />}
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
