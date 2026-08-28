import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminAuditEventDto } from '@jjoin/types';
import { api } from '../lib/api';
import { shortId } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { AdminStatusBadge } from '../components/AdminStatusBadge';
import { DateTimeCell } from '../components/cells/DateTimeCell';
import { renderLoadError } from '../components/renderLoadError';

function targetLink(event: AdminAuditEventDto) {
  if (event.targetType === 'COIN_ISSUANCE' || event.kind === 'COIN_ISSUANCE') {
    return `/coin/issuances/${event.targetId}`;
  }
  if (event.targetType === 'DISPUTE' || event.kind === 'DISPUTE_RESOLUTION') {
    return `/disputes/${event.targetId}`;
  }
  if (event.kind === 'MEMBERSHIP' || event.targetType === 'Subscription') {
    return `/memberships`;
  }
  return null;
}

export function AuditPage() {
  const [items, setItems] = useState<AdminAuditEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAdminAuditEvents({ limit: 100 });
      setItems(res.items);
    } catch (e) {
      setError(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: DataTableColumn<AdminAuditEventDto>[] = [
    {
      key: 'at',
      header: '시각',
      render: (r) => <DateTimeCell value={r.at} />,
    },
    {
      key: 'kind',
      header: '종류',
      render: (r) => (
        <AdminStatusBadge
          label={r.kind}
          tone={
            r.kind === 'DISPUTE_RESOLUTION'
              ? 'danger'
              : r.kind === 'MEMBERSHIP'
                ? 'info'
                : 'accent'
          }
        />
      ),
    },
    { key: 'actor', header: '처리자', render: (r) => r.actorLabel },
    { key: 'summary', header: '요약', render: (r) => r.summary },
    {
      key: 'target',
      header: '대상',
      render: (r) => {
        const href = targetLink(r);
        const label = `${r.targetType} / ${shortId(r.targetId)}`;
        return href ? <Link to={href}>{label}</Link> : label;
      },
    },
    { key: 'reason', header: '사유', render: (r) => r.reason ?? '—' },
  ];

  return (
    <div>
      <PageHeader
        title="감사 로그"
        description="코인 발행 · 분쟁 판정 · 멤버십"
        actions={
          <button type="button" onClick={() => void load()}>
            새로고침
          </button>
        }
      />
      {loading ? <LoadingState /> : null}
      {!loading && error ? renderLoadError(error, () => void load()) : null}
      {!loading && !error ? (
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(r) => r.eventId}
          empty={<EmptyState title="감사 이벤트가 없습니다" />}
        />
      ) : null}
    </div>
  );
}
