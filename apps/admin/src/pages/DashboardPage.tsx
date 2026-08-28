import { useCallback, useEffect, useState } from 'react';
import type { AdminDashboardDto } from '@jjoin/types';
import { api } from '../lib/api';
import { formatCoin } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { LoadingState } from '../components/LoadingState';
import { renderLoadError } from '../components/renderLoadError';

function coinOrPending(value: string | null): string {
  if (value == null) return '데이터 준비 중';
  return formatCoin(value);
}

export function DashboardPage() {
  const [data, setData] = useState<AdminDashboardDto | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.getAdminDashboard());
    } catch (e) {
      setError(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) return <LoadingState />;
  if (error && !data) return renderLoadError(error, () => void load());
  if (!data) return <LoadingState />;

  const identityTone =
    data.coinIdentityOk == null ? 'default' : data.coinIdentityOk ? 'ok' : 'warn';

  return (
    <div>
      <PageHeader
        title="대시보드"
        description="운영 KPI · 실제 API 값만 표시"
        actions={
          <button type="button" onClick={() => void load()}>
            새로고침
          </button>
        }
      />
      <div className="stat-grid">
        <StatCard label="전체 회원" value={data.totalMembers.toLocaleString('ko-KR')} />
        <StatCard label="오늘 가입" value={data.todaySignups.toLocaleString('ko-KR')} />
        <StatCard label="활성 조인" value={data.activeJoins.toLocaleString('ko-KR')} />
        <StatCard
          label="오늘 생성 조인"
          value={data.todayCreatedJoins.toLocaleString('ko-KR')}
        />
        <StatCard label="미결 분쟁" value={data.openDisputes.toLocaleString('ko-KR')} />
        <StatCard label="총 누적 발행" value={coinOrPending(data.totalIssued)} />
        <StatCard label="현재 유통" value={coinOrPending(data.currentSupply)} />
        <StatCard label="Available" value={coinOrPending(data.totalAvailable)} />
        <StatCard label="Held" value={coinOrPending(data.totalHeld)} />
        <StatCard
          label="코인 Identity"
          value={
            data.coinIdentityOk == null
              ? '데이터 준비 중'
              : data.coinIdentityOk
                ? 'OK'
                : 'MISMATCH'
          }
          tone={identityTone}
        />
      </div>
    </div>
  );
}
