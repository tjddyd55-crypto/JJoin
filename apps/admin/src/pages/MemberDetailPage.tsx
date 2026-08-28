import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type {
  AdminMemberDetailDto,
  AdminUserMembershipDetailDto,
} from '@jjoin/types';
import { api, ApiError } from '../lib/api';
import { formatCoin, formatDateTime, shortId } from '../lib/format';
import { entitlementLabel, renewalLabel } from '../lib/membershipLabels';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import { AdminStatusBadge } from '../components/AdminStatusBadge';
import {
  MembershipPlanBadge,
  MembershipStatusBadge,
} from '../components/MembershipPlanBadge';
import { FormDialog } from '../components/FormDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormField } from '../components/FormField';
import { TextAreaField } from '../components/TextAreaField';
import { DateTimeCell } from '../components/cells/DateTimeCell';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { useToast } from '../components/ToastProvider';
import { renderLoadError } from '../components/renderLoadError';
import type { AdminSubscriptionListItemDto } from '@jjoin/types';

export function MemberDetailPage() {
  const { userId } = useParams();
  const { pushToast } = useToast();
  const [data, setData] = useState<AdminMemberDetailDto | null>(null);
  const [membership, setMembership] = useState<AdminUserMembershipDetailDto | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const [grantOpen, setGrantOpen] = useState(false);
  const [confirmGrant, setConfirmGrant] = useState(false);
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantPeriodDays, setGrantPeriodDays] = useState('30');
  const [grantReason, setGrantReason] = useState('');
  const [grantError, setGrantError] = useState<string | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [member, mem] = await Promise.all([
        api.getAdminMember(userId),
        api.getAdminUserMembership(userId),
      ]);
      setData(member);
      setMembership(mem);
    } catch (e) {
      setError(e);
      setData(null);
      setMembership(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const grantPeriodEndPreview = useMemo(() => {
    const days = Number(grantPeriodDays);
    if (!Number.isInteger(days) || days < 1) return null;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }, [grantPeriodDays]);

  const effective = membership?.effective ?? data?.membership ?? null;
  const activeSub = membership?.subscription ?? null;
  const canCancel =
    effective?.planCode === 'PREMIUM' &&
    activeSub &&
    !activeSub.cancelAtPeriodEnd &&
    activeSub.status !== 'EXPIRED';

  async function submitGrant() {
    if (!userId) return;
    setGrantBusy(true);
    setGrantError(null);
    try {
      await api.activateAdminSubscription({
        userId,
        planCode: 'PREMIUM',
        periodDays: Number(grantPeriodDays),
        reason: grantReason.trim(),
        referenceId: `admin-grant:${userId}:${Date.now()}`,
        source: 'ADMIN_TEST',
      });
      pushToast('Premium 부여 완료 (코인 변동 없음)', 'success');
      setGrantOpen(false);
      setConfirmGrant(false);
      setGrantReason('');
      setGrantPeriodDays('30');
      await load();
    } catch (e) {
      setGrantError(e instanceof ApiError ? e.message : '부여 실패');
      setConfirmGrant(false);
    } finally {
      setGrantBusy(false);
    }
  }

  async function submitCancel() {
    if (!activeSub) return;
    setCancelBusy(true);
    try {
      await api.scheduleCancelAdminSubscription(activeSub.subscriptionId, {
        reason: cancelReason.trim(),
      });
      pushToast('기간 종료 시 해지 예약 완료', 'success');
      setCancelOpen(false);
      setConfirmCancel(false);
      setCancelReason('');
      await load();
    } catch (e) {
      pushToast(e instanceof ApiError ? e.message : '해지 예약 실패', 'error');
      setConfirmCancel(false);
    } finally {
      setCancelBusy(false);
    }
  }

  const historyColumns: DataTableColumn<AdminSubscriptionListItemDto>[] = [
    {
      key: 'plan',
      header: 'Plan',
      render: (r) => <MembershipPlanBadge planCode={r.planCode} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <MembershipStatusBadge status={r.status} />,
    },
    {
      key: 'start',
      header: 'Start',
      render: (r) => <DateTimeCell value={r.startsAt} />,
    },
    {
      key: 'end',
      header: 'Period end',
      render: (r) => <DateTimeCell value={r.currentPeriodEnd} />,
    },
    { key: 'source', header: 'Source', render: (r) => r.source },
    { key: 'reason', header: 'Reason', render: (r) => r.reason ?? '—' },
  ];

  if (loading) return <LoadingState />;
  if (error || !data) return renderLoadError(error ?? new Error('not_found'), () => void load());

  return (
    <div>
      <Link to="/members" className="back-link">
        ← 회원 목록
      </Link>
      <PageHeader
        title={data.nickname ?? '(닉네임 없음)'}
        description={`userId ${shortId(data.userId, 12)}`}
        actions={
          <>
            <Link to={`/coin/users/${data.userId}`}>
              <button type="button">코인 이력</button>
            </Link>
            <button type="button" className="btn-primary" onClick={() => setGrantOpen(true)}>
              Premium 부여
            </button>
          </>
        }
      />

      <div className="section-card">
        <h2>프로필</h2>
        <dl className="dl-grid">
          <dt>지역</dt>
          <dd>{data.regionLabel ?? '—'}</dd>
          <dt>소개</dt>
          <dd>{data.bio ?? '—'}</dd>
          <dt>성별</dt>
          <dd>{data.gender ?? '—'}</dd>
          <dt>연령대</dt>
          <dd>{data.ageBand ?? '—'}</dd>
          <dt>가입일</dt>
          <dd>{formatDateTime(data.createdAt)}</dd>
          <dt>최근 로그인</dt>
          <dd>{formatDateTime(data.lastLoginAt)}</dd>
        </dl>
      </div>

      <div className="section-card">
        <h2>계정</h2>
        <dl className="dl-grid">
          <dt>계정 상태</dt>
          <dd>
            <AdminStatusBadge label={data.accountStatus} />
          </dd>
          <dt>본인인증</dt>
          <dd>
            <AdminStatusBadge label={data.identityStatus} tone="info" />
          </dd>
        </dl>
      </div>

      <div className="section-card">
        <h2>소셜 연결</h2>
        {data.socialLinks.length === 0 ? (
          <p className="text-muted">연결된 소셜이 없습니다.</p>
        ) : (
          <div className="chip-row">
            {data.socialLinks.map((link) => (
              <span key={`${link.provider}-${link.linkedAt}`} className="chip">
                {link.provider} · {formatDateTime(link.linkedAt)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="section-card">
        <h2>지갑</h2>
        <dl className="dl-grid">
          <dt>Available</dt>
          <dd>{formatCoin(data.availableCoin)}</dd>
          <dt>Held</dt>
          <dd>{formatCoin(data.heldCoin)}</dd>
        </dl>
      </div>

      <div className="section-card">
        <h2>조인</h2>
        <dl className="dl-grid">
          <dt>호스트</dt>
          <dd>{data.hostedJoinCount.toLocaleString('ko-KR')}</dd>
          <dt>참가</dt>
          <dd>{data.participatedJoinCount.toLocaleString('ko-KR')}</dd>
        </dl>
      </div>

      <div className="section-card">
        <h2>멤버십</h2>
        {!effective ? (
          <p className="text-muted">멤버십 정보를 불러오지 못했습니다.</p>
        ) : (
          <>
            <dl className="dl-grid">
              <dt>Effective Plan</dt>
              <dd>
                <MembershipPlanBadge planCode={effective.planCode} />
                {renewalLabel({
                  planCode: effective.planCode,
                  cancelAtPeriodEnd: effective.cancelAtPeriodEnd,
                  status: effective.status,
                }) ? (
                  <span className="chip" style={{ marginLeft: 8 }}>
                    해지 예정
                  </span>
                ) : null}
              </dd>
              <dt>Subscription status</dt>
              <dd>
                <MembershipStatusBadge status={effective.status} />
              </dd>
              <dt>startsAt</dt>
              <dd>{activeSub ? formatDateTime(activeSub.startsAt) : '—'}</dd>
              <dt>currentPeriodStart</dt>
              <dd>{formatDateTime(effective.currentPeriodStart)}</dd>
              <dt>currentPeriodEnd</dt>
              <dd>{formatDateTime(effective.currentPeriodEnd)}</dd>
              <dt>cancelAtPeriodEnd</dt>
              <dd>{effective.cancelAtPeriodEnd ? 'Yes' : 'No'}</dd>
              <dt>cancelledAt</dt>
              <dd>{activeSub?.cancelledAt ? formatDateTime(activeSub.cancelledAt) : '—'}</dd>
              <dt>endedAt</dt>
              <dd>{activeSub?.endedAt ? formatDateTime(activeSub.endedAt) : '—'}</dd>
              <dt>source / provider</dt>
              <dd>
                {activeSub
                  ? `${activeSub.source}${activeSub.provider ? ` / ${activeSub.provider}` : ''}`
                  : '— (Subscription 없음 → FREE)'}
              </dd>
              <dt>Entitlements</dt>
              <dd>
                {effective.entitlements.length === 0 ? (
                  '—'
                ) : (
                  <ul>
                    {effective.entitlements.map((code) => (
                      <li key={code}>
                        <code>{code}</code> · {entitlementLabel(code)}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </dl>
            {canCancel ? (
              <button type="button" className="btn-danger" onClick={() => setCancelOpen(true)}>
                기간 종료 시 해지
              </button>
            ) : null}
          </>
        )}
      </div>

      <div className="section-card">
        <h2>Subscription history</h2>
        {!membership || membership.history.length === 0 ? (
          <p className="text-muted">이력이 없습니다. FREE 기본 상태입니다.</p>
        ) : (
          <DataTable
            columns={historyColumns}
            rows={membership.history}
            rowKey={(r) => r.subscriptionId}
          />
        )}
      </div>

      <div className="section-card">
        <h2>Membership audit</h2>
        {!membership || membership.audits.length === 0 ? (
          <p className="text-muted">감사 이벤트가 없습니다.</p>
        ) : (
          <ul className="audit-list">
            {membership.audits.map((a) => (
              <li key={a.eventId}>
                <strong>{a.action}</strong> · {a.actorLabel} · {formatDateTime(a.createdAt)}
                {a.reason ? ` · ${a.reason}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <FormDialog
        open={grantOpen && !confirmGrant}
        title="Premium 부여"
        description="코인을 지급하지 않습니다. 조인 생성 이용료 면제만 부여됩니다."
        confirmLabel="다음"
        confirmDisabled={!grantReason.trim() || Number(grantPeriodDays) < 1}
        busy={grantBusy}
        onConfirm={() => setConfirmGrant(true)}
        onCancel={() => {
          setGrantOpen(false);
          setConfirmGrant(false);
          setGrantError(null);
        }}
      >
        <FormField
          label="기간 (일)"
          type="number"
          min={1}
          value={grantPeriodDays}
          onChange={(e) => setGrantPeriodDays(e.target.value)}
          hint={
            grantPeriodEndPreview
              ? `종료 예정: ${formatDateTime(grantPeriodEndPreview.toISOString())}`
              : undefined
          }
        />
        <TextAreaField
          label="사유 (required)"
          value={grantReason}
          onChange={(e) => setGrantReason(e.target.value)}
        />
        {grantError ? <p className="field-error">{grantError}</p> : null}
      </FormDialog>

      <ConfirmDialog
        open={grantOpen && confirmGrant}
        title="Premium 부여 확인"
        message={
          grantPeriodEndPreview
            ? `${data.nickname ?? shortId(data.userId, 8)} 회원에게 ${formatDateTime(grantPeriodEndPreview.toISOString())}까지 Premium을 부여합니다.`
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
        onCancel={() => setCancelOpen(false)}
      >
        <TextAreaField
          label="사유 (required)"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
      </FormDialog>

      <ConfirmDialog
        open={cancelOpen && confirmCancel}
        title="해지 예약 확인"
        message={
          activeSub
            ? `현재 이용기간 종료일(${formatDateTime(activeSub.currentPeriodEnd)})까지 Premium 혜택은 유지됩니다.`
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
