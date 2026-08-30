import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  CoinIssuanceType,
  DisputeResolution,
  DisputeStatus,
  MockAuthPersona,
  SocialProvider,
  StoreOwnerRelation,
  StoreVerificationStatus,
  type AdminDisputeDetailDto,
  type AdminDisputeListItemDto,
  type AdminUserCoinHistoryDto,
  type CoinIssuanceDetailDto,
  type CoinIssuanceListItemDto,
  type CoinSupplyDashboardDto,
  type CoinSupplyReconciliationDto,
  type AdminStoreDetailDto,
  type AdminStoreKpiPeriod,
  type AdminStoreListItemDto,
  type StoreOwnershipRequestDto,
} from '@jjoin/types';
import { formatKoreanPhoneDisplay, formatNumber } from '@jjoin/domain';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';
const TOKEN_KEY = 'jjoin_admin_token';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`${res.status}:${raw.slice(0, 160)}`);
  return JSON.parse(raw) as T;
}

function formatCoin(v: string | number) {
  return formatNumber(v);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR');
}

const RELATION_LABELS: Record<StoreOwnerRelation, string> = {
  [StoreOwnerRelation.REPRESENTATIVE]: '대표',
  [StoreOwnerRelation.OWNER]: '점주',
  [StoreOwnerRelation.MANAGER]: '매니저',
  [StoreOwnerRelation.OTHER]: '기타',
};

function LoginBar() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInAdmin() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ session: { accessToken: string } }>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ loginId, password }),
      });
      localStorage.setItem(TOKEN_KEY, res.session.accessToken);
      window.location.reload();
    } catch {
      setError('로그인에 실패했습니다. ID/비밀번호를 확인하세요.');
    } finally {
      setBusy(false);
    }
  }

  async function signInDevAdmin() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ session: { accessToken: string } }>('/auth/social/mock-sign-in', {
        method: 'POST',
        body: JSON.stringify({
          provider: SocialProvider.KAKAO,
          persona: MockAuthPersona.DEV_ADMIN,
        }),
      });
      localStorage.setItem(TOKEN_KEY, res.session.accessToken);
      window.location.reload();
    } catch {
      setError('DEV_ADMIN 로그인 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '48px auto', padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>관리자 로그인</h2>
      <p style={{ color: '#666', fontSize: 14 }}>
        Railway <code>JJOIN_ADMIN_LOGIN_ID</code> / <code>JJOIN_ADMIN_LOGIN_PASSWORD</code> 계정
      </p>
      <label style={{ display: 'block', marginBottom: 8 }}>
        ID
        <input
          style={{ display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }}
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          autoComplete="username"
        />
      </label>
      <label style={{ display: 'block', marginBottom: 12 }}>
        Password
        <input
          style={{ display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>
      {error ? <div style={{ color: '#b00020', marginBottom: 8 }}>{error}</div> : null}
      <button disabled={busy || !loginId || !password} onClick={() => void signInAdmin()}>
        로그인
      </button>
      <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 12 }}>
        <button disabled={busy} onClick={() => void signInDevAdmin()}>
          DEV_ADMIN (mock)
        </button>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const token = useMemo(() => localStorage.getItem(TOKEN_KEY), []);
  const loc = useLocation();
  const coinActive = loc.pathname === '/' || loc.pathname.startsWith('/coin');
  const disputeActive = loc.pathname.startsWith('/disputes');
  const storeVerificationActive = loc.pathname.startsWith('/store-verifications');
  const approvedStoresActive = loc.pathname.startsWith('/stores');
  if (!token) {
    return (
      <div className="layout layout-wide">
        <LoginBar />
      </div>
    );
  }
  return (
    <div className="layout layout-wide">
      <header className="admin-nav card row">
        <strong>JJOIN HQ</strong>
        <Link to="/coin" className={coinActive ? 'nav-active' : undefined}>
          코인 관리
        </Link>
        <Link to="/disputes" className={disputeActive ? 'nav-active' : undefined}>
          분쟁
        </Link>
        <Link
          to="/store-verifications"
          className={storeVerificationActive ? 'nav-active' : undefined}
        >
          인증 대기
        </Link>
        <Link to="/stores" className={approvedStoresActive ? 'nav-active' : undefined}>
          승인 매장
        </Link>
        <button
          onClick={() => {
            localStorage.removeItem(TOKEN_KEY);
            window.location.reload();
          }}
        >
          로그아웃
        </button>
      </header>
      {children}
    </div>
  );
}

function StoreVerificationListPage() {
  const [items, setItems] = useState<StoreOwnershipRequestDto[]>([]);
  const [status, setStatus] = useState<StoreVerificationStatus | ''>(StoreVerificationStatus.PENDING);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<StoreOwnershipRequestDto[]>(
        `/admin/store-verifications${status ? `?status=${status}` : ''}`,
      );
      setItems(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed');
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h1>매장 인증</h1>
      <div className="row" style={{ marginBottom: 12 }}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StoreVerificationStatus | '')}
        >
          <option value="">ALL</option>
          <option value={StoreVerificationStatus.PENDING}>PENDING</option>
          <option value={StoreVerificationStatus.APPROVED}>APPROVED</option>
          <option value={StoreVerificationStatus.REJECTED}>REJECTED</option>
        </select>
        <button onClick={() => void load()}>새로고침</button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <table className="data-table">
        <thead>
          <tr>
            <th>신청자</th>
            <th>연락처</th>
            <th>시설명</th>
            <th>관계</th>
            <th>신청일</th>
            <th>상태</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id}>
              <td>{row.applicantName}</td>
              <td>{row.applicantPhone}</td>
              <td>{row.facilityName}</td>
              <td>{RELATION_LABELS[row.relation]}</td>
              <td>{formatDate(row.createdAt)}</td>
              <td>{row.status}</td>
              <td>
                <Link to={`/store-verifications/${row.id}`}>상세</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StoreVerificationDetailPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<StoreOwnershipRequestDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'revoke' | null>(null);

  const load = useCallback(async () => {
    if (!requestId) return;
    const res = await api<StoreOwnershipRequestDto[]>(
      `/admin/store-verifications`,
    );
    const found = res.find((row) => row.id === requestId) ?? null;
    setDetail(found);
  }, [requestId]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : 'load_failed'));
  }, [load]);

  async function runAction(action: 'approve' | 'reject' | 'revoke') {
    if (!requestId || busy) return;
    if (action === 'reject' && !rejectReason.trim()) {
      setError('거절 사유를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (action === 'approve') {
        await api(`/admin/store-verifications/${requestId}/approve`, { method: 'POST' });
      } else if (action === 'reject') {
        await api(`/admin/store-verifications/${requestId}/reject`, {
          method: 'POST',
          body: JSON.stringify({
            rejectReason: rejectReason.trim(),
            adminNote: adminNote.trim() || undefined,
          }),
        });
      } else {
        await api(`/admin/store-verifications/${requestId}/revoke`, { method: 'POST' });
      }
      setConfirmAction(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'action_failed');
    } finally {
      setBusy(false);
    }
  }

  if (!detail) return <p>{error ?? '불러오는 중…'}</p>;

  const canApprove = detail.status === StoreVerificationStatus.PENDING;
  const canReject = detail.status === StoreVerificationStatus.PENDING;
  const canRevoke = detail.status === StoreVerificationStatus.APPROVED;

  return (
    <div>
      <button onClick={() => navigate('/store-verifications')}>← 목록</button>
      <h1>매장 인증 상세</h1>
      <div className="card">
        <div>
          <strong>{detail.facilityName}</strong>
        </div>
        <div>{detail.facilityAddress ?? '—'}</div>
        <div>
          {detail.applicantName} · {detail.applicantPhone} · {RELATION_LABELS[detail.relation]}
        </div>
        <div>상태 {detail.status}</div>
        <div>신청 {formatDate(detail.createdAt)}</div>
        {detail.businessRegistrationNo ? <div>사업자번호 {detail.businessRegistrationNo}</div> : null}
        {detail.memo ? <div>메모: {detail.memo}</div> : null}
        {detail.rejectReason ? <div>거절 사유: {detail.rejectReason}</div> : null}
        {detail.adminNote ? <div>운영 메모: {detail.adminNote}</div> : null}
      </div>

      {canReject ? (
        <div className="card">
          <label>
            거절 사유
            <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </label>
          <label>
            운영 메모 (선택)
            <input value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
          </label>
        </div>
      ) : null}

      {(canApprove || canReject || canRevoke) ? (
        <div className="row" style={{ marginTop: 12 }}>
          {canApprove ? (
            <button className="primary" disabled={busy} onClick={() => setConfirmAction('approve')}>
              승인
            </button>
          ) : null}
          {canReject ? (
            <button className="danger" disabled={busy} onClick={() => setConfirmAction('reject')}>
              거절
            </button>
          ) : null}
          {canRevoke ? (
            <button className="danger" disabled={busy} onClick={() => setConfirmAction('revoke')}>
              승인 철회
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      {confirmAction ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>
              {confirmAction === 'approve'
                ? '승인'
                : confirmAction === 'reject'
                  ? '거절'
                  : '승인 철회'}
            </h3>
            <p>
              {confirmAction === 'approve'
                ? '이 매장 인증 요청을 승인합니다.'
                : confirmAction === 'reject'
                  ? `거절 사유: ${rejectReason.trim() || '(미입력)'}`
                  : '승인된 매장 권한을 철회합니다.'}
            </p>
            <div className="row">
              <button disabled={busy} onClick={() => setConfirmAction(null)}>
                취소
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() => void runAction(confirmAction)}
              >
                확정
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DisputeListPage() {
  const [items, setItems] = useState<AdminDisputeListItemDto[]>([]);
  const [status, setStatus] = useState<DisputeStatus | ''>(DisputeStatus.OPEN);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ items: AdminDisputeListItemDto[] }>(
        `/admin/disputes${status ? `?status=${status}` : ''}`,
      );
      setItems(res.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed');
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h1>분쟁 목록</h1>
      <div className="row" style={{ marginBottom: 12 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value as DisputeStatus | '')}>
          <option value="">ALL</option>
          <option value="OPEN">OPEN</option>
          <option value="UNDER_REVIEW">UNDER_REVIEW</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>
        <button onClick={() => void load()}>새로고침</button>
      </div>
      {error ? <p>{error}</p> : null}
      {items.map((d) => (
        <Link key={d.disputeId} to={`/disputes/${d.disputeId}`} style={{ textDecoration: 'none' }}>
          <div className="card">
            <strong>{d.venueName}</strong> · {d.participantNickname} · {d.rewardAmount} Coin
            <div>
              {d.status} · {d.reasonType}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function DisputeDetailPage() {
  const { disputeId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AdminDisputeDetailDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [confirm, setConfirm] = useState<DisputeResolution | null>(null);

  const load = useCallback(async () => {
    if (!disputeId) return;
    const res = await api<AdminDisputeDetailDto>(`/admin/disputes/${disputeId}`);
    setDetail(res);
  }, [disputeId]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : 'load_failed'));
  }, [load]);

  async function resolve(resolution: DisputeResolution) {
    if (!disputeId || busy) return;
    setBusy(true);
    try {
      await api(`/admin/disputes/${disputeId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolution, adminNote: adminNote || undefined }),
      });
      setConfirm(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'resolve_failed');
    } finally {
      setBusy(false);
    }
  }

  if (!detail) return <p>{error ?? '불러오는 중…'}</p>;

  const payLabel = `참가자에게 ${detail.rewardAmount} Coin 지급`;
  const refundLabel = `방장에게 ${detail.rewardAmount} Coin 반환`;

  return (
    <div>
      <button onClick={() => navigate('/disputes')}>← 목록</button>
      <h1>분쟁 상세</h1>
      <div className="card">
        <div>{detail.venueName}</div>
        <div>
          Host {detail.hostNickname} · Participant {detail.participantNickname}
        </div>
        <div>
          Reward {detail.rewardAmount} · {detail.rewardStatus} · Hold {detail.holdStatus ?? '-'}
        </div>
        <div>
          Status {detail.status}
          {detail.resolution ? ` · ${detail.resolution}` : ''}
        </div>
      </div>
      <div className="card">
        <strong>Host 설명</strong>
        <p>{detail.hostStatement ?? '(없음)'}</p>
        <strong>Participant 설명</strong>
        <p>{detail.participantStatement ?? '(없음)'}</p>
      </div>
      {detail.status !== DisputeStatus.RESOLVED ? (
        <>
          <textarea
            placeholder="운영 메모 (내부)"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={3}
          />
          <div className="row" style={{ marginTop: 12 }}>
            <button className="primary" disabled={busy} onClick={() => setConfirm(DisputeResolution.PAY_PARTICIPANT)}>
              {payLabel}
            </button>
            <button className="danger" disabled={busy} onClick={() => setConfirm(DisputeResolution.REFUND_HOST)}>
              {refundLabel}
            </button>
          </div>
        </>
      ) : null}
      {error ? <p>{error}</p> : null}
      {confirm ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>판정 확정</h3>
            <p>{confirm === DisputeResolution.PAY_PARTICIPANT ? payLabel : refundLabel}</p>
            <p>확정 후 변경할 수 없습니다.</p>
            <div className="row">
              <button disabled={busy} onClick={() => setConfirm(null)}>
                취소
              </button>
              <button className="primary" disabled={busy} onClick={() => void resolve(confirm)}>
                확정
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ManualIssuanceDialog(props: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [issuanceType, setIssuanceType] = useState<CoinIssuanceType>(CoinIssuanceType.ADMIN_GRANT);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!props.open) return null;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const idempotencyKey = `admin-manual:${userId}:${amount}:${Date.now()}`;
      await api('/admin/coin/issuances', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId.trim(),
          amount: amount.trim(),
          issuanceType,
          reason: reason.trim(),
          idempotencyKey,
        }),
      });
      props.onDone();
      props.onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'issue_failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>수동 발행</h3>
        <p>신규 Coin 생성 (ISSUANCE). Transfer가 아닙니다.</p>
        <label>
          사용자 ID
          <input value={userId} onChange={(e) => setUserId(e.target.value)} />
        </label>
        <label>
          수량
          <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label>
          유형
          <select
            value={issuanceType}
            onChange={(e) => setIssuanceType(e.target.value as CoinIssuanceType)}
          >
            <option value={CoinIssuanceType.ADMIN_GRANT}>ADMIN_GRANT</option>
            <option value={CoinIssuanceType.CUSTOMER_SUPPORT}>CUSTOMER_SUPPORT</option>
            <option value={CoinIssuanceType.EVENT_REWARD}>EVENT_REWARD</option>
            <option value={CoinIssuanceType.PROMOTION}>PROMOTION</option>
            <option value={CoinIssuanceType.OTHER}>OTHER</option>
          </select>
        </label>
        <label>
          사유
          <input value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        {error ? <p>{error}</p> : null}
        <div className="row">
          <button disabled={busy} onClick={props.onClose}>
            취소
          </button>
          <button className="primary" disabled={busy} onClick={() => void submit()}>
            발행
          </button>
        </div>
      </div>
    </div>
  );
}

function CoinSupplyPage() {
  const [excludeDevSeed, setExcludeDevSeed] = useState(false);
  const [dash, setDash] = useState<CoinSupplyDashboardDto | null>(null);
  const [recon, setRecon] = useState<CoinSupplyReconciliationDto | null>(null);
  const [items, setItems] = useState<CoinIssuanceListItemDto[]>([]);
  const [issuanceType, setIssuanceType] = useState<CoinIssuanceType | ''>('');
  const [range, setRange] = useState<'today' | '7d' | '30d' | 'month' | 'all'>('30d');
  const [error, setError] = useState<string | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
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
    try {
      const qs = excludeDevSeed ? '?excludeDevSeed=1' : '';
      const [d, r, list] = await Promise.all([
        api<CoinSupplyDashboardDto>(`/admin/coin/supply${qs}`),
        api<CoinSupplyReconciliationDto>('/admin/coin/supply/reconcile'),
        api<{ items: CoinIssuanceListItemDto[] }>(
          `/admin/coin/issuances?${new URLSearchParams({
            ...(issuanceType ? { issuanceType } : {}),
            ...(excludeDevSeed ? { excludeDevSeed: '1' } : {}),
            ...(rangeParams.from ? { from: rangeParams.from } : {}),
            limit: '50',
          }).toString()}`,
        ),
      ]);
      setDash(d);
      setRecon(r);
      setItems(list.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed');
    }
  }, [excludeDevSeed, issuanceType, rangeParams.from]);

  useEffect(() => {
    void load();
  }, [load]);

  async function lookupUser() {
    if (!userLookup.trim()) return;
    try {
      const res = await api<AdminUserCoinHistoryDto>(`/admin/coin/users/${userLookup.trim()}`);
      setUserHistory(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'user_lookup_failed');
      setUserHistory(null);
    }
  }

  const kpi = dash?.kpi;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>코인 관리</h1>
        <div className="row">
          <label className="row" style={{ alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={excludeDevSeed}
              onChange={(e) => setExcludeDevSeed(e.target.checked)}
            />
            DEV_SEED 제외(기간/breakdown)
          </label>
          <button onClick={() => void load()}>새로고침</button>
          <button className="primary" onClick={() => setGrantOpen(true)}>
            수동 발행
          </button>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {kpi ? (
        <div className="kpi-grid">
          <div className="card kpi">
            <div className="kpi-label">총 누적 발행</div>
            <div className="kpi-value">{formatCoin(kpi.totalIssued)}</div>
            <div className="kpi-sub">운영 발행 {formatCoin(kpi.productionIssued)}</div>
          </div>
          <div className="card kpi">
            <div className="kpi-label">현재 유통</div>
            <div className="kpi-value">{formatCoin(kpi.currentSupply)}</div>
          </div>
          <div className="card kpi">
            <div className="kpi-label">Available</div>
            <div className="kpi-value">{formatCoin(kpi.totalAvailable)}</div>
          </div>
          <div className="card kpi">
            <div className="kpi-label">Held</div>
            <div className="kpi-value">{formatCoin(kpi.totalHeld)}</div>
          </div>
          <div className="card kpi">
            <div className="kpi-label">누적 소멸</div>
            <div className="kpi-value">{formatCoin(kpi.totalBurned)}</div>
          </div>
          <div className="card kpi">
            <div className="kpi-label">오늘 / 이번 달 발행</div>
            <div className="kpi-value">
              {formatCoin(kpi.todayIssued)} / {formatCoin(kpi.monthIssued)}
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <strong>발행 유형별 Breakdown</strong>
        <table className="data-table">
          <thead>
            <tr>
              <th>유형</th>
              <th>수량</th>
            </tr>
          </thead>
          <tbody>
            {(dash?.breakdown ?? []).map((b) => (
              <tr key={b.issuanceType}>
                <td>{b.issuanceType}</td>
                <td>{formatCoin(b.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <strong>Supply Reconciliation</strong>
        {recon ? (
          <div>
            <p>
              Issued {formatCoin(recon.totalIssued)} − Burned {formatCoin(recon.totalBurned)} ={' '}
              {formatCoin(recon.currentSupplyFromBooks)}
            </p>
            <p>
              Available {formatCoin(recon.totalAvailable)} + Held {formatCoin(recon.totalHeld)} ={' '}
              {formatCoin(recon.currentSupplyFromWallets)}
            </p>
            <p className={recon.ok ? 'ok-text' : 'error-text'}>
              {recon.ok ? 'IDENTITY OK' : `MISMATCH delta=${formatCoin(recon.delta)} (자동 수정 금지)`}
            </p>
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <strong>발행 내역</strong>
          <select value={range} onChange={(e) => setRange(e.target.value as typeof range)}>
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
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>일시</th>
              <th>사용자</th>
              <th>수량</th>
              <th>유형</th>
              <th>사유</th>
              <th>Reference</th>
              <th>처리자</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.issuanceId}>
                <td>{new Date(row.createdAt).toLocaleString('ko-KR')}</td>
                <td>
                  <Link to={`/coin/users/${row.userId}`}>
                    {row.userNickname ?? row.userId.slice(0, 8)}
                  </Link>
                </td>
                <td>+{formatCoin(row.amount)}</td>
                <td>{row.issuanceType}</td>
                <td>{row.reason ?? '—'}</td>
                <td>
                  {row.referenceType ?? '—'}
                  {row.referenceId ? ` / ${row.referenceId.slice(0, 12)}` : ''}
                </td>
                <td>{row.createdByLabel}</td>
                <td>
                  <Link to={`/coin/issuances/${row.issuanceId}`}>상세</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <strong>사용자 Coin History</strong>
        <div className="row">
          <input
            placeholder="userId"
            value={userLookup}
            onChange={(e) => setUserLookup(e.target.value)}
            style={{ maxWidth: 360 }}
          />
          <button onClick={() => void lookupUser()}>조회</button>
        </div>
        {userHistory ? (
          <div style={{ marginTop: 12 }}>
            <p>
              {userHistory.nickname ?? userHistory.userId} · Available{' '}
              {formatCoin(userHistory.availableCoin)} · Held {formatCoin(userHistory.heldCoin)}
            </p>
            <p>
              누적 발행 수령 {formatCoin(userHistory.lifetimeIssuedReceived)} · Transfer 수령{' '}
              {formatCoin(userHistory.lifetimeTransferReceived)} · Burn 기여{' '}
              {formatCoin(userHistory.lifetimeBurnContributed)}
            </p>
          </div>
        ) : null}
      </div>

      <ManualIssuanceDialog open={grantOpen} onClose={() => setGrantOpen(false)} onDone={() => void load()} />
    </div>
  );
}

function IssuanceDetailPage() {
  const { issuanceId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<CoinIssuanceDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!issuanceId) return;
    void api<CoinIssuanceDetailDto>(`/admin/coin/issuances/${issuanceId}`)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : 'load_failed'));
  }, [issuanceId]);

  if (!detail) return <p>{error ?? '불러오는 중…'}</p>;

  return (
    <div>
      <button onClick={() => navigate('/coin')}>← 코인 관리</button>
      <h1>발행 상세</h1>
      <div className="card">
        <p>ID {detail.issuanceId}</p>
        <p>
          {detail.userNickname ?? detail.userId} · +{formatCoin(detail.amount)} · {detail.issuanceType}
        </p>
        <p>사유: {detail.reason ?? '—'}</p>
        <p>
          Reference: {detail.referenceType ?? '—'} / {detail.referenceId ?? '—'}
        </p>
        <p>
          처리자: {detail.createdByLabel} · {new Date(detail.createdAt).toLocaleString('ko-KR')}
        </p>
        <p>Ledger TX: {detail.ledgerTxId}</p>
        <p>Status: {detail.status}</p>
        {detail.metadata ? <pre>{JSON.stringify(detail.metadata, null, 2)}</pre> : null}
      </div>
    </div>
  );
}

function UserCoinPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AdminUserCoinHistoryDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    void api<AdminUserCoinHistoryDto>(`/admin/coin/users/${userId}`)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : 'load_failed'));
  }, [userId]);

  if (!detail) return <p>{error ?? '불러오는 중…'}</p>;

  return (
    <div>
      <button onClick={() => navigate('/coin')}>← 코인 관리</button>
      <h1>사용자 Coin</h1>
      <div className="card">
        <p>
          {detail.nickname ?? detail.userId}
        </p>
        <p>
          Available {formatCoin(detail.availableCoin)} · Held {formatCoin(detail.heldCoin)}
        </p>
        <p>
          누적 발행 수령 {formatCoin(detail.lifetimeIssuedReceived)} (신규 mint만)
        </p>
        <p>
          누적 Transfer 수령 {formatCoin(detail.lifetimeTransferReceived)} (발행 아님)
        </p>
        <p>Burn 기여 {formatCoin(detail.lifetimeBurnContributed)}</p>
      </div>
      <div className="card">
        <strong>최근 Ledger</strong>
        <table className="data-table">
          <thead>
            <tr>
              <th>일시</th>
              <th>유형</th>
              <th>금액</th>
              <th>라벨</th>
            </tr>
          </thead>
          <tbody>
            {detail.recentTransactions.map((tx) => (
              <tr key={tx.id}>
                <td>{new Date(tx.createdAt).toLocaleString('ko-KR')}</td>
                <td>{tx.type}</td>
                <td>{formatCoin(tx.amount)}</td>
                <td>{tx.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatKpiRate(rate: number | null): string {
  if (rate == null) return '—';
  return `${rate}%`;
}

function ApprovedStoresPage() {
  const [items, setItems] = useState<AdminStoreListItemDto[]>([]);
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState<AdminStoreKpiPeriod>('all');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      params.set('period', period);
      const res = await api<AdminStoreListItemDto[]>(`/admin/stores?${params}`);
      setItems(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed');
    }
  }, [q, period]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h1>승인 매장</h1>
      <div className="row" style={{ marginBottom: 12, gap: 8 }}>
        <input
          placeholder="매장명 · 점주 · 연락처 · 주소"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as AdminStoreKpiPeriod)}
        >
          <option value="all">전체</option>
          <option value="30d">30일</option>
          <option value="90d">90일</option>
        </select>
        <button type="button" onClick={() => void load()}>
          검색
        </button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>매장</th>
            <th>점주</th>
            <th>연락처</th>
            <th>시도</th>
            <th>성사</th>
            <th>성사율</th>
            <th>상태</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.ownershipId}>
              <td>{row.facilityName}</td>
              <td>{row.ownerName ?? '—'}</td>
              <td>{formatKoreanPhoneDisplay(row.ownerPhone) || '—'}</td>
              <td>{row.kpi.attemptCount}</td>
              <td>{row.kpi.succeededCount}</td>
              <td>{formatKpiRate(row.kpi.successRatePercent)}</td>
              <td>{row.status}</td>
              <td>
                <Link to={`/stores/${row.ownershipId}`}>상세</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApprovedStoreDetailPage() {
  const { ownershipId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AdminStoreDetailDto | null>(null);
  const [period, setPeriod] = useState<AdminStoreKpiPeriod>('all');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ownershipId) return;
    try {
      const res = await api<AdminStoreDetailDto>(
        `/admin/stores/${ownershipId}?period=${period}`,
      );
      setDetail(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed');
    }
  }, [ownershipId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div>
        <button type="button" onClick={() => navigate('/stores')}>
          ← 목록
        </button>
        <p className="error-text">{error}</p>
      </div>
    );
  }
  if (!detail) return <div>불러오는 중…</div>;
  const { ownership: o } = detail;
  const { kpi } = o;

  return (
    <div>
      <button type="button" onClick={() => navigate('/stores')}>
        ← 목록
      </button>
      <h1>{o.facilityName}</h1>
      <select
        value={period}
        onChange={(e) => setPeriod(e.target.value as AdminStoreKpiPeriod)}
      >
        <option value="all">전체</option>
        <option value="30d">30일</option>
        <option value="90d">90일</option>
      </select>
      <p>
        점주 {detail.applicantName ?? o.ownerName ?? '—'} ·{' '}
        {formatKoreanPhoneDisplay(detail.applicantPhone ?? o.ownerPhone) || '—'}
      </p>
      <p>주소 {o.facilityAddress ?? '—'}</p>
      <p>
        KPI 시도 {kpi.attemptCount} / 성사 {kpi.succeededCount} / 취소{' '}
        {kpi.cancelledCount} / 성사율 {formatKpiRate(kpi.successRatePercent)} / 참가{' '}
        {kpi.participantSum}
      </p>
      <h3>최근 모집</h3>
      <ul>
        {detail.recentJoins.map((j) => (
          <li key={j.joinId}>
            {formatDate(j.startAt)} · {j.status} · {j.confirmedPlayerCount}/
            {j.plannedPlayerCount} · {j.succeeded ? '성사' : '-'}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<CoinSupplyPage />} />
        <Route path="/coin" element={<CoinSupplyPage />} />
        <Route path="/coin/issuances/:issuanceId" element={<IssuanceDetailPage />} />
        <Route path="/coin/users/:userId" element={<UserCoinPage />} />
        <Route path="/disputes" element={<DisputeListPage />} />
        <Route path="/disputes/:disputeId" element={<DisputeDetailPage />} />
        <Route path="/store-verifications" element={<StoreVerificationListPage />} />
        <Route path="/store-verifications/:requestId" element={<StoreVerificationDetailPage />} />
        <Route path="/stores" element={<ApprovedStoresPage />} />
        <Route path="/stores/:ownershipId" element={<ApprovedStoreDetailPage />} />
      </Routes>
    </Shell>
  );
}
