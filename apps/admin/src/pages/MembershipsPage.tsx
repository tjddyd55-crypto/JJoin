import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type {
  AdminSubscriptionDetailDto,
  AdminSubscriptionListItemDto,
} from '@jjoin/types';
import { api, ApiError } from '../lib/api';
import { formatDateTime, shortId } from '../lib/format';
import { entitlementLabel, renewalLabel } from '../lib/membershipLabels';
import { useQueryState } from '../lib/useQueryState';
import { PageHeader } from '../components/PageHeader';
import { FilterBar } from '../components/FilterBar';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { Pagination } from '../components/Pagination';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { FormDialog } from '../components/FormDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { TextAreaField } from '../components/TextAreaField';
import { UserCell } from '../components/cells/UserCell';
import { DateTimeCell } from '../components/cells/DateTimeCell';
import {
  MembershipPlanBadge,
  MembershipStatusBadge,
} from '../components/MembershipPlanBadge';
import { useToast } from '../components/ToastProvider';
import { renderLoadError } from '../components/renderLoadError';

const PAGE_SIZE = 20;

export function MembershipsPage() {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { q, qDraft, setQDraft, page, setPage, setParams, searchParams } = useQueryState();

  const planCode = searchParams.get('planCode') ?? '';
  const status = searchParams.get('status') ?? '';
  const effectivePremium = searchParams.get('effectivePremium') ?? '';
  const cancelScheduled = searchParams.get('cancelScheduled') ?? '';
  const periodEndFrom = searchParams.get('periodEndFrom') ?? '';
  const periodEndTo = searchParams.get('periodEndTo') ?? '';

  const [items, setItems] = useState<AdminSubscriptionListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const [detail, setDetail] = useState<AdminSubscriptionDetailDto | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [grantOpen, setGrantOpen] = useState(false);
  const [confirmGrant, setConfirmGrant] = useState(false);
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantPeriodDays, setGrantPeriodDays] = useState('30');
  const [grantReason, setGrantReason] = useState('');

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AdminSubscriptionListItemDto | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAdminSubscriptions({
        q: q || undefined,
        planCode: planCode || undefined,
        status: status || undefined,
        effectivePremium:
          effectivePremium === 'true' ? true : effectivePremium === 'false' ? false : undefined,
        cancelScheduled:
          cancelScheduled === 'true' ? true : cancelScheduled === 'false' ? false : undefined,
        periodEndFrom: periodEndFrom || undefined,
        periodEndTo: periodEndTo || undefined,
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
  }, [
    q,
    planCode,
    status,
    effectivePremium,
    cancelScheduled,
    periodEndFrom,
    periodEndTo,
    page,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const grantPeriodEndPreview = useMemo(() => {
    const days = Number(grantPeriodDays);
    if (!Number.isInteger(days) || days < 1) return null;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }, [grantPeriodDays]);

  function resetGrant() {
    setGrantUserId('');
    setGrantPeriodDays('30');
    setGrantReason('');
    setGrantError(null);
    setConfirmGrant(false);
  }

  async function submitGrant() {
    setGrantBusy(true);
    setGrantError(null);
    try {
      const referenceId = `admin-grant:${grantUserId.trim()}:${Date.now()}`;
      const res = await api.activateAdminSubscription({
        userId: grantUserId.trim(),
        planCode: 'PREMIUM',
        periodDays: Number(grantPeriodDays),
        reason: grantReason.trim(),
        referenceId,
        source: 'ADMIN_TEST',
      });
      pushToast(
        res.alreadyExists ? '이미 동일 reference로 부여됨' : 'Premium 부여 완료 (코인 변동 없음)',
        'success',
      );
      setGrantOpen(false);
      resetGrant();
      await load();
    } catch (e) {
      setGrantError(e instanceof ApiError ? e.message : '부여 실패');
      setConfirmGrant(false);
    } finally {
      setGrantBusy(false);
    }
  }

  async function openDetail(row: AdminSubscriptionListItemDto) {
    try {
      const d = await api.getAdminSubscription(row.subscriptionId);
      setDetail(d);
      setDetailOpen(true);
    } catch (e) {
      pushToast(e instanceof ApiError ? e.message : '상세 조회 실패', 'error');
    }
  }

  async function submitCancel() {
    if (!cancelTarget) return;
    setCancelBusy(true);
    try {
      await api.scheduleCancelAdminSubscription(cancelTarget.subscriptionId, {
        reason: cancelReason.trim(),
      });
      pushToast('기간 종료 시 해지 예약 완료', 'success');
      setCancelOpen(false);
      setConfirmCancel(false);
      setCancelTarget(null);
      setCancelReason('');
      setDetailOpen(false);
      await load();
    } catch (e) {
      pushToast(e instanceof ApiError ? e.message : '해지 예약 실패', 'error');
      setConfirmCancel(false);
    } finally {
      setCancelBusy(false);
    }
  }

  const columns: DataTableColumn<AdminSubscriptionListItemDto>[] = [
    {
      key: 'user',
      header: 'User',
      render: (row) => (
        <span
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/members/${row.userId}`);
          }}
        >
          <UserCell nickname={row.nickname} userId={row.userId} />
        </span>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (row) => <MembershipPlanBadge planCode={row.planCode} />,
    },
    {
      key: 'effective',
      header: 'Effective',
      render: (row) => (
        <div className="chip-row">
          <MembershipPlanBadge planCode={row.effectivePlanCode} />
          {renewalLabel({
            planCode: row.effectivePlanCode,
            cancelAtPeriodEnd: row.cancelAtPeriodEnd,
            status: row.status,
          }) ? (
            <span className="chip">해지 예정</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Subscription',
      render: (row) => <MembershipStatusBadge status={row.status} />,
    },
    {
      key: 'start',
      header: 'Start',
      render: (row) => <DateTimeCell value={row.startsAt} />,
    },
    {
      key: 'end',
      header: 'Period end',
      render: (row) => <DateTimeCell value={row.currentPeriodEnd} />,
    },
    {
      key: 'cancel',
      header: 'Cancel@end',
      render: (row) => (row.cancelAtPeriodEnd ? 'Yes' : 'No'),
    },
    { key: 'source', header: 'Source', render: (row) => row.source },
  ];

  return (
    <div>
      <PageHeader
        title="멤버십 관리"
        description="Effective plan은 resolver 기준. Premium 부여는 코인을 발행하지 않습니다."
        actions={
          <button type="button" className="btn-primary" onClick={() => setGrantOpen(true)}>
            Premium 부여
          </button>
        }
      />

      <FilterBar>
        <input
          className="filter-grow"
          placeholder="닉네임 또는 userId"
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
        />
        <select
          value={planCode}
          onChange={(e) => setParams({ planCode: e.target.value || null, page: 1 })}
          aria-label="Plan"
        >
          <option value="">Plan 전체</option>
          <option value="PREMIUM">PREMIUM</option>
          <option value="FREE">FREE (row)</option>
        </select>
        <select
          value={status}
          onChange={(e) => setParams({ status: e.target.value || null, page: 1 })}
          aria-label="Status"
        >
          <option value="">Status 전체</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="EXPIRED">EXPIRED</option>
          <option value="PAST_DUE">PAST_DUE</option>
          <option value="PENDING">PENDING</option>
        </select>
        <select
          value={effectivePremium}
          onChange={(e) => setParams({ effectivePremium: e.target.value || null, page: 1 })}
          aria-label="Effective Premium"
        >
          <option value="">Effective 전체</option>
          <option value="true">Effective PREMIUM</option>
          <option value="false">Effective FREE</option>
        </select>
        <select
          value={cancelScheduled}
          onChange={(e) => setParams({ cancelScheduled: e.target.value || null, page: 1 })}
          aria-label="Cancel scheduled"
        >
          <option value="">해지예정 전체</option>
          <option value="true">해지 예정</option>
          <option value="false">해지 예정 아님</option>
        </select>
        <input
          type="date"
          value={periodEndFrom.slice(0, 10)}
          onChange={(e) =>
            setParams({
              periodEndFrom: e.target.value ? new Date(e.target.value).toISOString() : null,
              page: 1,
            })
          }
          aria-label="Period end from"
        />
        <input
          type="date"
          value={periodEndTo.slice(0, 10)}
          onChange={(e) =>
            setParams({
              periodEndTo: e.target.value
                ? new Date(`${e.target.value}T23:59:59.999Z`).toISOString()
                : null,
              page: 1,
            })
          }
          aria-label="Period end to"
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
            rowKey={(r) => r.subscriptionId}
            onRowClick={(r) => void openDetail(r)}
            empty={<EmptyState title="Subscription이 없습니다" description="FREE 회원은 row가 없을 수 있습니다. Premium 부여로 생성하세요." />}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      ) : null}

      {detailOpen && detail ? (
        <div className="dialog-backdrop" role="presentation" onClick={() => setDetailOpen(false)}>
          <div
            className="dialog is-wide"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Subscription 상세</h3>
            <p className="text-muted">{shortId(detail.subscription.subscriptionId, 16)}</p>
            <dl className="dl-grid">
              <dt>User</dt>
              <dd>
                <Link to={`/members/${detail.subscription.userId}`}>
                  {detail.subscription.nickname ?? detail.subscription.userId}
                </Link>
              </dd>
              <dt>Plan (row)</dt>
              <dd>
                <MembershipPlanBadge planCode={detail.subscription.planCode} />
              </dd>
              <dt>Effective plan</dt>
              <dd>
                <MembershipPlanBadge planCode={detail.effective.planCode} />
                {renewalLabel({
                  planCode: detail.effective.planCode,
                  cancelAtPeriodEnd: detail.effective.cancelAtPeriodEnd,
                  status: detail.effective.status,
                }) ? (
                  <span className="chip" style={{ marginLeft: 8 }}>
                    해지 예정
                  </span>
                ) : null}
              </dd>
              <dt>Raw status</dt>
              <dd>
                <MembershipStatusBadge status={detail.subscription.status} />
              </dd>
              <dt>Period</dt>
              <dd>
                {formatDateTime(detail.subscription.currentPeriodStart)} →{' '}
                {formatDateTime(detail.subscription.currentPeriodEnd)}
              </dd>
              <dt>Cancel@end</dt>
              <dd>{detail.subscription.cancelAtPeriodEnd ? 'Yes' : 'No'}</dd>
              <dt>Source</dt>
              <dd>
                {detail.subscription.source}
                {detail.subscription.provider ? ` / ${detail.subscription.provider}` : ''}
              </dd>
              <dt>Reference</dt>
              <dd>{detail.subscription.referenceId ?? '—'}</dd>
              <dt>Entitlements</dt>
              <dd>
                {detail.entitlements.length === 0
                  ? '—'
                  : detail.entitlements.map((c) => (
                      <div key={c}>
                        <code>{c}</code> · {entitlementLabel(c)}
                      </div>
                    ))}
              </dd>
            </dl>

            <h4 style={{ marginTop: 16 }}>Audit</h4>
            {detail.audits.length === 0 ? (
              <p className="text-muted">감사 이벤트 없음</p>
            ) : (
              <ul className="audit-list">
                {detail.audits.map((a) => (
                  <li key={a.eventId}>
                    <strong>{a.action}</strong> · {a.actorLabel} · {formatDateTime(a.createdAt)}
                    {a.reason ? ` · ${a.reason}` : ''}
                  </li>
                ))}
              </ul>
            )}

            <div className="dialog-actions">
              <button type="button" onClick={() => setDetailOpen(false)}>
                닫기
              </button>
              {detail.subscription.effectivePlanCode === 'PREMIUM' &&
              !detail.subscription.cancelAtPeriodEnd ? (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => {
                    setCancelTarget(detail.subscription);
                    setCancelReason('');
                    setConfirmCancel(false);
                    setCancelOpen(true);
                  }}
                >
                  기간 종료 시 해지
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <FormDialog
        open={grantOpen && !confirmGrant}
        title="Premium 부여"
        description="코인을 지급하지 않습니다. ROOM_CREATION_FEE_WAIVER만 부여됩니다."
        confirmLabel="다음"
        confirmDisabled={
          !grantUserId.trim() ||
          !grantReason.trim() ||
          !Number.isInteger(Number(grantPeriodDays)) ||
          Number(grantPeriodDays) < 1
        }
        busy={grantBusy}
        onConfirm={() => setConfirmGrant(true)}
        onCancel={() => {
          setGrantOpen(false);
          resetGrant();
        }}
      >
        <FormField
          label="회원 userId"
          value={grantUserId}
          onChange={(e) => setGrantUserId(e.target.value)}
          placeholder="회원 상세에서 복사한 userId"
          hint="회원 관리 검색으로 userId를 확인하세요."
        />
        <SelectField
          label="Plan"
          value="PREMIUM"
          options={[{ value: 'PREMIUM', label: 'PREMIUM' }]}
          disabled
        />
        <FormField
          label="기간 (일)"
          type="number"
          min={1}
          value={grantPeriodDays}
          onChange={(e) => setGrantPeriodDays(e.target.value)}
          hint={
            grantPeriodEndPreview
              ? `이용기간 종료 예정: ${formatDateTime(grantPeriodEndPreview.toISOString())}`
              : undefined
          }
        />
        <TextAreaField
          label="사유 (required)"
          value={grantReason}
          onChange={(e) => setGrantReason(e.target.value)}
          rows={3}
        />
        {grantError ? <p className="field-error">{grantError}</p> : null}
      </FormDialog>

      <ConfirmDialog
        open={grantOpen && confirmGrant}
        title="Premium 부여 확인"
        message={
          grantPeriodEndPreview
            ? `${shortId(grantUserId.trim(), 12)} 회원에게 ${formatDateTime(grantPeriodEndPreview.toISOString())}까지 Premium을 부여합니다. 코인은 변동되지 않습니다.`
            : 'Premium을 부여합니다.'
        }
        confirmLabel="부여"
        busy={grantBusy}
        onConfirm={() => void submitGrant()}
        onCancel={() => setConfirmGrant(false)}
      />

      <FormDialog
        open={cancelOpen && !confirmCancel}
        title="기간 종료 시 해지"
        description="현재 이용기간 종료일까지 Premium 혜택은 유지됩니다."
        confirmLabel="다음"
        confirmDisabled={!cancelReason.trim()}
        busy={cancelBusy}
        onConfirm={() => setConfirmCancel(true)}
        onCancel={() => {
          setCancelOpen(false);
          setCancelTarget(null);
          setCancelReason('');
        }}
      >
        <TextAreaField
          label="사유 (required)"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={3}
        />
      </FormDialog>

      <ConfirmDialog
        open={cancelOpen && confirmCancel}
        title="해지 예약 확인"
        message={
          cancelTarget
            ? `현재 이용기간 종료일(${formatDateTime(cancelTarget.currentPeriodEnd)})까지 Premium 혜택은 유지됩니다.`
            : '해지를 예약합니다.'
        }
        confirmLabel="해지 예약"
        busy={cancelBusy}
        onConfirm={() => void submitCancel()}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
