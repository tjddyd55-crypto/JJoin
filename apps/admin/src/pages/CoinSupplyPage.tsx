import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CoinIssuanceType,
  type AdminUserCoinHistoryDto,
  type CoinIssuanceListItemDto,
  type CoinSupplyDashboardDto,
  type CoinSupplyReconciliationDto,
} from '@jjoin/types';
import { api, ApiError } from '../lib/api';
import { formatCoin } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { FilterBar } from '../components/FilterBar';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { FormDialog } from '../components/FormDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { UserCell } from '../components/cells/UserCell';
import { DateTimeCell } from '../components/cells/DateTimeCell';
import { CoinAmountCell } from '../components/cells/CoinAmountCell';
import { useToast } from '../components/ToastProvider';
import { renderLoadError } from '../components/renderLoadError';

type RangeKey = 'today' | '7d' | '30d' | 'month' | 'all';

const MANUAL_TYPES: CoinIssuanceType[] = [
  CoinIssuanceType.ADMIN_GRANT,
  CoinIssuanceType.CUSTOMER_SUPPORT,
  CoinIssuanceType.EVENT_REWARD,
  CoinIssuanceType.PROMOTION,
  CoinIssuanceType.OTHER,
];

export function CoinSupplyPage() {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [excludeDevSeed, setExcludeDevSeed] = useState(false);
  const [dash, setDash] = useState<CoinSupplyDashboardDto | null>(null);
  const [recon, setRecon] = useState<CoinSupplyReconciliationDto | null>(null);
  const [items, setItems] = useState<CoinIssuanceListItemDto[]>([]);
  const [issuanceType, setIssuanceType] = useState<CoinIssuanceType | ''>('');
  const [range, setRange] = useState<RangeKey>('30d');
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [grantOpen, setGrantOpen] = useState(false);
  const [confirmGrant, setConfirmGrant] = useState(false);
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [manualType, setManualType] = useState<CoinIssuanceType>(CoinIssuanceType.ADMIN_GRANT);
  const [reason, setReason] = useState('');
  const [userLookup, setUserLookup] = useState('');
  const [userHistory, setUserHistory] = useState<AdminUserCoinHistoryDto | null>(null);

  const rangeParams = useMemo(() => {
    const now = new Date();
    if (range === 'all') return {};
    if (range === 'today') {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      return { from: from.toISOString() };
    }
    if (range === 'month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: from.toISOString() };
    }
    const days = range === '7d' ? 7 : 30;
    const from = new Date(now.getTime() - days * 24 * 60 * 60_000);
    return { from: from.toISOString() };
  }, [range]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, r, list] = await Promise.all([
        api.getAdminCoinSupply({ excludeDevSeed }),
        api.reconcileAdminCoinSupply(),
        api.listAdminCoinIssuances({
          issuanceType: issuanceType || undefined,
          excludeDevSeed,
          from: rangeParams.from,
          limit: 50,
        }),
      ]);
      setDash(d);
      setRecon(r);
      setItems(list.items);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [excludeDevSeed, issuanceType, rangeParams.from]);

  useEffect(() => {
    void load();
  }, [load]);

  async function lookupUser() {
    if (!userLookup.trim()) return;
    try {
      const res = await api.getAdminUserCoinHistory(userLookup.trim());
      setUserHistory(res);
      navigate(`/coin/users/${res.userId}`);
    } catch (e) {
      setUserHistory(null);
      pushToast(e instanceof ApiError ? e.message : '조회 실패', 'error');
    }
  }

  function resetGrantForm() {
    setUserId('');
    setAmount('');
    setManualType(CoinIssuanceType.ADMIN_GRANT);
    setReason('');
    setGrantError(null);
    setConfirmGrant(false);
  }

  async function submitGrant() {
    setGrantBusy(true);
    setGrantError(null);
    try {
      const idempotencyKey = `admin-manual:${userId}:${amount}:${Date.now()}`;
      await api.createAdminCoinIssuance({
        userId: userId.trim(),
        amount: amount.trim(),
        issuanceType: manualType as
          | CoinIssuanceType.ADMIN_GRANT
          | CoinIssuanceType.CUSTOMER_SUPPORT
          | CoinIssuanceType.OTHER
          | CoinIssuanceType.PROMOTION
          | CoinIssuanceType.EVENT_REWARD,
        reason: reason.trim(),
        idempotencyKey,
      });
      pushToast('수동 발행 완료', 'success');
      setGrantOpen(false);
      resetGrantForm();
      await load();
    } catch (e) {
      setGrantError(e instanceof ApiError ? e.message : '발행 실패');
      setConfirmGrant(false);
    } finally {
      setGrantBusy(false);
    }
  }

  const columns: DataTableColumn<CoinIssuanceListItemDto>[] = [
    {
      key: 'at',
      header: '일시',
      render: (row) => <DateTimeCell value={row.createdAt} />,
    },
    {
      key: 'user',
      header: '사용자',
      render: (row) => (
        <span
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/coin/users/${row.userId}`);
          }}
        >
          <UserCell nickname={row.userNickname} userId={row.userId} />
        </span>
      ),
    },
    {
      key: 'amount',
      header: '수량',
      render: (row) => <CoinAmountCell value={row.amount} signed />,
    },
    { key: 'type', header: '유형', render: (row) => row.issuanceType },
    { key: 'reason', header: '사유', render: (row) => row.reason ?? '—' },
    {
      key: 'ref',
      header: 'Reference',
      render: (row) =>
        `${row.referenceType ?? '—'}${row.referenceId ? ` / ${row.referenceId.slice(0, 12)}` : ''}`,
    },
    { key: 'by', header: '처리자', render: (row) => row.createdByLabel },
  ];

  if (loading && !dash) return <LoadingState />;
  if (error && !dash) return renderLoadError(error, () => void load());

  const kpi = dash?.kpi;

  return (
    <div>
      <PageHeader
        title="코인 관리"
        description="ISSUED − BURNED = AVAILABLE + HELD"
        actions={
          <>
            <label className="row" style={{ alignItems: 'center', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={excludeDevSeed}
                onChange={(e) => setExcludeDevSeed(e.target.checked)}
              />
              DEV_SEED 제외
            </label>
            <button type="button" onClick={() => void load()}>
              새로고침
            </button>
            <button type="button" className="btn-primary" onClick={() => setGrantOpen(true)}>
              수동 발행
            </button>
          </>
        }
      />

      {kpi ? (
        <div className="stat-grid">
          <StatCard
            label="총 누적 발행"
            value={formatCoin(kpi.totalIssued)}
            sub={`운영 발행 ${formatCoin(kpi.productionIssued)}`}
          />
          <StatCard label="현재 유통" value={formatCoin(kpi.currentSupply)} />
          <StatCard label="Available" value={formatCoin(kpi.totalAvailable)} />
          <StatCard label="Held" value={formatCoin(kpi.totalHeld)} />
          <StatCard label="누적 소멸" value={formatCoin(kpi.totalBurned)} />
          <StatCard
            label="오늘 / 이번 달 발행"
            value={`${formatCoin(kpi.todayIssued)} / ${formatCoin(kpi.monthIssued)}`}
          />
        </div>
      ) : null}

      <div className="section-card">
        <h2>발행 유형별 Breakdown</h2>
        <DataTable
          columns={[
            { key: 'type', header: '유형', render: (r) => r.issuanceType },
            {
              key: 'amount',
              header: '수량',
              render: (r) => <CoinAmountCell value={r.amount} />,
            },
          ]}
          rows={dash?.breakdown ?? []}
          rowKey={(r) => r.issuanceType}
          empty={<EmptyState title="Breakdown 없음" />}
        />
      </div>

      <div className="section-card">
        <h2>Supply Reconciliation</h2>
        {recon ? (
          <div className="stack-sm">
            <p>
              Issued {formatCoin(recon.totalIssued)} − Burned {formatCoin(recon.totalBurned)} ={' '}
              {formatCoin(recon.currentSupplyFromBooks)}
            </p>
            <p>
              Available {formatCoin(recon.totalAvailable)} + Held {formatCoin(recon.totalHeld)} ={' '}
              {formatCoin(recon.currentSupplyFromWallets)}
            </p>
            <p className={recon.ok ? 'text-ok' : 'text-danger'}>
              {recon.ok
                ? 'IDENTITY OK'
                : `MISMATCH delta=${formatCoin(recon.delta)} (자동 수정 금지)`}
            </p>
          </div>
        ) : null}
      </div>

      <div className="section-card">
        <h2>발행 내역</h2>
        <FilterBar>
          <select value={range} onChange={(e) => setRange(e.target.value as RangeKey)}>
            <option value="today">오늘</option>
            <option value="7d">7일</option>
            <option value="30d">30일</option>
            <option value="month">이번 달</option>
            <option value="all">전체</option>
          </select>
          <select
            value={issuanceType}
            onChange={(e) => setIssuanceType(e.target.value as CoinIssuanceType | '')}
          >
            <option value="">전체 유형</option>
            {Object.values(CoinIssuanceType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(r) => r.issuanceId}
          onRowClick={(r) => navigate(`/coin/issuances/${r.issuanceId}`)}
          empty={<EmptyState title="발행 내역이 없습니다" />}
        />
      </div>

      <div className="section-card">
        <h2>사용자 Coin 조회</h2>
        <FilterBar>
          <input
            className="filter-grow"
            placeholder="userId"
            value={userLookup}
            onChange={(e) => setUserLookup(e.target.value)}
          />
          <button type="button" onClick={() => void lookupUser()}>
            조회
          </button>
        </FilterBar>
        {userHistory ? (
          <p className="text-muted">
            {userHistory.nickname ?? userHistory.userId} · Available{' '}
            {formatCoin(userHistory.availableCoin)} · Held {formatCoin(userHistory.heldCoin)}
          </p>
        ) : null}
      </div>

      <FormDialog
        open={grantOpen && !confirmGrant}
        title="수동 발행"
        description="신규 Coin 생성 (ISSUANCE). Transfer가 아닙니다."
        confirmLabel="다음"
        busy={grantBusy}
        confirmDisabled={!userId.trim() || !amount.trim() || !reason.trim()}
        onCancel={() => {
          setGrantOpen(false);
          resetGrantForm();
        }}
        onConfirm={() => setConfirmGrant(true)}
      >
        <FormField
          label="사용자 ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <FormField label="수량" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <SelectField
          label="유형"
          value={manualType}
          onChange={(e) => setManualType(e.target.value as CoinIssuanceType)}
          options={MANUAL_TYPES.map((t) => ({ value: t, label: t }))}
        />
        <FormField label="사유" value={reason} onChange={(e) => setReason(e.target.value)} />
        {grantError ? <p className="text-danger">{grantError}</p> : null}
      </FormDialog>

      <ConfirmDialog
        open={confirmGrant}
        title="발행 확정"
        message={`${userId} 에게 ${amount} Coin을 ${manualType}으로 발행합니다.`}
        confirmLabel="발행"
        busy={grantBusy}
        onCancel={() => setConfirmGrant(false)}
        onConfirm={() => void submitGrant()}
      />
    </div>
  );
}
