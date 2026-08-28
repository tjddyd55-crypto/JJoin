import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AdminVenueDetailDto } from '@jjoin/types';
import { api } from '../lib/api';
import { formatDateTime, shortId } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { AdminStatusBadge } from '../components/AdminStatusBadge';
import { DateTimeCell } from '../components/cells/DateTimeCell';
import { renderLoadError } from '../components/renderLoadError';

export function VenueDetailPage() {
  const { venueId } = useParams();
  const [data, setData] = useState<AdminVenueDetailDto | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api.getAdminVenue(venueId));
    } catch (e) {
      setError(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error || !data) {
    return renderLoadError(error ?? new Error('not_found'), () => void load());
  }

  return (
    <div>
      <Link to="/venues" className="back-link">
        ← 장소 목록
      </Link>
      <PageHeader title={data.name} description={shortId(data.venueId, 12)} />

      <div className="section-card">
        <dl className="dl-grid">
          <dt>Provider</dt>
          <dd>{data.provider}</dd>
          <dt>Kakao Place ID</dt>
          <dd className="mono">{data.providerPlaceId}</dd>
          <dt>주소</dt>
          <dd>{data.address ?? '—'}</dd>
          <dt>도로명</dt>
          <dd>{data.roadAddress ?? '—'}</dd>
          <dt>지역</dt>
          <dd>{data.region ?? '—'}</dd>
          <dt>전화</dt>
          <dd>{data.phone ?? '—'}</dd>
          <dt>좌표</dt>
          <dd>
            {data.latitude}, {data.longitude}
          </dd>
          <dt>골프장 연결</dt>
          <dd>{data.golfFacilityId ?? '—'}</dd>
          <dt>조인</dt>
          <dd>
            {data.openJoinCount} open / {data.joinCount} total
          </dd>
          <dt>등록</dt>
          <dd>{formatDateTime(data.createdAt)}</dd>
        </dl>
      </div>

      <div className="section-card">
        <h2>최근 조인</h2>
        <DataTable
          columns={[
            {
              key: 'id',
              header: '조인',
              render: (r) => <Link to={`/joins/${r.joinId}`}>{shortId(r.joinId)}</Link>,
            },
            {
              key: 'status',
              header: '상태',
              render: (r) => <AdminStatusBadge label={r.status} tone="info" />,
            },
            {
              key: 'start',
              header: '시작',
              render: (r) => <DateTimeCell value={r.startAt} />,
            },
            { key: 'host', header: '호스트', render: (r) => r.hostNickname ?? '—' },
          ]}
          rows={data.recentJoins}
          rowKey={(r) => r.joinId}
          empty={<EmptyState title="최근 조인이 없습니다" />}
        />
      </div>
    </div>
  );
}
