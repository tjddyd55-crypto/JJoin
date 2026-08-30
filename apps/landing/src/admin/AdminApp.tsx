import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import './styles.css';
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
  type AdminStoreDetailDto,
  type AdminStoreKpiPeriod,
  type AdminStoreListItemDto,
  type AdminUserCoinHistoryDto,
  type CoinIssuanceDetailDto,
  type CoinIssuanceListItemDto,
  type CoinSupplyDashboardDto,
  type CoinSupplyReconciliationDto,
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

function statusBadgeClass(kind: 'success' | 'warning' | 'danger' | 'info' | 'neutral') {
  return `status-badge status-badge--${kind}`;
}

function storeStatusBadge(status: StoreVerificationStatus) {
  if (status === StoreVerificationStatus.APPROVED) {
    return <span className={statusBadgeClass('success')}>APPROVED</span>;
  }
  if (status === StoreVerificationStatus.REJECTED) {
    return <span className={statusBadgeClass('danger')}>REJECTED</span>;
  }
  if (status === StoreVerificationStatus.PENDING) {
    return <span className={statusBadgeClass('warning')}>PENDING</span>;
  }
  return <span className={statusBadgeClass('neutral')}>{status}</span>;
}

function disputeStatusBadge(status: DisputeStatus) {
  if (status === DisputeStatus.RESOLVED) {
    return <span className={statusBadgeClass('success')}>RESOLVED</span>;
  }
  if (status === DisputeStatus.UNDER_REVIEW) {
    return <span className={statusBadgeClass('info')}>UNDER_REVIEW</span>;
  }
  if (status === DisputeStatus.OPEN) {
    return <span className={statusBadgeClass('warning')}>OPEN</span>;
  }
  return <span className={statusBadgeClass('neutral')}>{status}</span>;
}

const RELATION_LABELS: Record<StoreOwnerRelation, string> = {
  [StoreOwnerRelation.REPRESENTATIVE]: '대표',
  [StoreOwnerRelation.OWNER]: '점주',
  [StoreOwnerRelation.MANAGER]: '매니저',
  [StoreOwnerRelation.OTHER]: '기타',
};

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem(TOKEN_KEY)) {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  async function signInAdmin() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ session: { accessToken: string } }>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ loginId, password }),
      });
      localStorage.setItem(TOKEN_KEY, res.session.accessToken);
      navigate('/admin', { replace: true });
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
      navigate('/admin', { replace: true });
    } catch {
      setError('DEV_ADMIN 로그인 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-root">
      <div className="layout layout-wide">
        <div className="card admin-login-card">
          <h2>관리자 로그인</h2>
          <p className="login-hint">
            Railway <code>JJOIN_ADMIN_LOGIN_ID</code> / <code>JJOIN_ADMIN_LOGIN_PASSWORD</code> 계정
          </p>
          <label>
            ID
            <input
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? <div className="admin-error-banner">{error}</div> : null}
          <div className="login-actions">
            <button
              className="btn-primary"
              disabled={busy || !loginId || !password}
              onClick={() => void signInAdmin()}
            >
              로그인
            </button>
          </div>
          {import.meta.env.DEV ? (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--admin-border)', paddingTop: 12 }}>
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => void signInDevAdmin()}>
                DEV_ADMIN (mock)
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const token = useMemo(() => localStorage.getItem(TOKEN_KEY), []);
  const loc = useLocation();
  const path = loc.pathname;
  const dashActive = path === '/admin' || path === '/admin/';
  const coinActive = path.startsWith('/admin/coin');
  const disputeActive = path.startsWith('/admin/disputes');
  const storeVerificationActive = path.startsWith('/admin/store-verifications');
  const approvedStoresActive = path.startsWith('/admin/stores');
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return (
    <div className="admin-root">
      <div className="layout layout-wide">
        <header className="admin-nav card row">
          <strong>JJOINZONE HQ</strong>
          <Link to="/admin" className={dashActive ? 'nav-active' : undefined}>
            대시보드
          </Link>
          <Link to="/admin/coin" className={coinActive ? 'nav-active' : undefined}>
            코인 관리
          </Link>
          <Link
            to="/admin/store-verifications"
            className={storeVerificationActive ? 'nav-active' : undefined}
          >
            인증 대기
          </Link>
          <Link to="/admin/stores" className={approvedStoresActive ? 'nav-active' : undefined}>
            승인 매장
          </Link>
          <Link to="/admin/disputes" className={disputeActive ? 'nav-active' : undefined}>
            분쟁 관리
          </Link>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              localStorage.removeItem(TOKEN_KEY);
              navigate('/admin/login', { replace: true });
            }}
          >
            로그아웃
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [pendingStores, setPendingStores] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    void api<StoreOwnershipRequestDto[]>(
      `/admin/store-verifications?status=${StoreVerificationStatus.PENDING}`,
    )
      .then((rows) => {
        setPendingStores(rows.length);
        setLoadError(false);
      })
      .catch(() => {
        setPendingStores(null);
        setLoadError(true);
      });
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">운영 대시보드</h1>
          <p className="admin-page-desc">매장 인증·코인·분쟁 운영 메뉴로 바로 이동합니다.</p>
        </div>
      </div>

      {loadError ? (
        <p className="admin-error-banner">대기 건수를 불러오지 못했습니다. 메뉴에서 직접 확인하세요.</p>
      ) : null}

      <div className="dash-kpi-grid">
        <div className="card dash-kpi-card">
          <div className="dash-kpi-label">대기 중 매장 인증</div>
          <div className="dash-kpi-value">{pendingStores == null ? '—' : pendingStores}</div>
          <div className="dash-kpi-sub">PENDING 상태 신청</div>
        </div>
      </div>

      <div className="card admin-section">
        <strong className="admin-section-title">바로가기</strong>
        <p className="admin-section-desc">자주 쓰는 운영 화면</p>
        <div className="dash-links" style={{ marginTop: 12 }}>
          <Link to="/admin/store-verifications" className="card dash-link-card">
            <span className="dash-link-title">인증 대기</span>
            <span className="dash-link-desc">신청 목록 · 승인 · 거절</span>
          </Link>
          <Link to="/admin/stores" className="card dash-link-card">
            <span className="dash-link-title">승인 매장</span>
            <span className="dash-link-desc">ACTIVE ownership · KPI</span>
          </Link>
          <Link to="/admin/coin" className="card dash-link-card">
            <span className="dash-link-title">코인 관리</span>
            <span className="dash-link-desc">공급 · 발행 · 정합성</span>
          </Link>
          <Link to="/admin/disputes" className="card dash-link-card">
            <span className="dash-link-title">분쟁 관리</span>
            <span className="dash-link-desc">분쟁 목록 · 판정</span>
          </Link>
        </div>
      </div>
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
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">매장 인증</h1>
          <p className="admin-page-desc">골프시설 점주 인증 신청을 검토하고 승인·거절합니다.</p>
        </div>
        <div className="admin-page-actions">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StoreVerificationStatus | '')}
          >
            <option value="">전체</option>
            <option value={StoreVerificationStatus.PENDING}>PENDING</option>
            <option value={StoreVerificationStatus.APPROVED}>APPROVED</option>
            <option value={StoreVerificationStatus.REJECTED}>REJECTED</option>
          </select>
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            새로고침
          </button>
        </div>
      </div>
      {error ? <p className="admin-error-banner">{error}</p> : null}
      <div className="card admin-section">
        <div className="admin-table-wrap">
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
              {items.length === 0 && !error ? (
                <tr>
                  <td colSpan={7}>
                    <p className="admin-empty">해당 조건의 신청이 없습니다.</p>
                  </td>
                </tr>
              ) : null}
              {items.map((row) => (
                <tr key={row.id}>
                  <td>{row.applicantName}</td>
                  <td>{row.applicantPhone}</td>
                  <td>{row.facilityName}</td>
                  <td>{RELATION_LABELS[row.relation]}</td>
                  <td>{formatDate(row.createdAt)}</td>
                  <td>{storeStatusBadge(row.status)}</td>
                  <td>
                    <Link to={`/admin/store-verifications/${row.id}`}>상세</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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

  if (!detail) {
    return (
      <div className="admin-page">
        <p className={error ? 'admin-error-banner' : 'admin-loading'}>{error ?? '불러오는 중…'}</p>
      </div>
    );
  }

  const canApprove = detail.status === StoreVerificationStatus.PENDING;
  const canReject = detail.status === StoreVerificationStatus.PENDING;
  const canRevoke = detail.status === StoreVerificationStatus.APPROVED;

  return (
    <div className="admin-page">
      <button
        type="button"
        className="btn-secondary admin-back"
        onClick={() => navigate('/admin/store-verifications')}
      >
        ← 목록
      </button>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">매장 인증 상세</h1>
          <p className="admin-page-desc">신청 정보를 확인하고 승인·거절합니다.</p>
        </div>
        <div>{storeStatusBadge(detail.status)}</div>
      </div>

      <div className="card admin-section">
        <div className="admin-detail-grid">
          <div>
            <strong>{detail.facilityName}</strong>
          </div>
          <div className="muted">{detail.facilityAddress ?? '—'}</div>
          <div>
            {detail.applicantName} · {detail.applicantPhone} · {RELATION_LABELS[detail.relation]}
          </div>
          <div className="muted">신청 {formatDate(detail.createdAt)}</div>
          {detail.businessRegistrationNo ? <div>사업자번호 {detail.businessRegistrationNo}</div> : null}
          {detail.memo ? <div>메모: {detail.memo}</div> : null}
          {detail.rejectReason ? <div>거절 사유: {detail.rejectReason}</div> : null}
          {detail.adminNote ? <div>운영 메모: {detail.adminNote}</div> : null}
        </div>
      </div>

      {canReject ? (
        <div className="card admin-section">
          <strong className="admin-section-title">거절 입력</strong>
          <p className="admin-section-desc">거절 시 사유는 필수입니다.</p>
          <label style={{ marginTop: 12 }}>
            거절 사유
            <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </label>
          <label>
            운영 메모 (선택)
            <input value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
          </label>
        </div>
      ) : null}

      {canApprove || canReject || canRevoke ? (
        <div className="admin-page-actions">
          {canApprove ? (
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => setConfirmAction('approve')}
            >
              승인
            </button>
          ) : null}
          {canReject ? (
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={() => setConfirmAction('reject')}
            >
              거절
            </button>
          ) : null}
          {canRevoke ? (
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={() => setConfirmAction('revoke')}
            >
              승인 철회
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="admin-error-banner">{error}</p> : null}

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
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirmAction(null)}>
                취소
              </button>
              <button
                type="button"
                className={confirmAction === 'approve' ? 'btn-primary' : 'danger'}
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
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">승인 매장</h1>
          <p className="admin-page-desc">ACTIVE StoreOwnership 목록과 모집 KPI</p>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <input
          placeholder="매장명 · 점주 · 연락처 · 주소"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as AdminStoreKpiPeriod)}
        >
          <option value="all">전체 기간</option>
          <option value="30d">최근 30일</option>
          <option value="90d">최근 90일</option>
        </select>
        <button type="button" onClick={() => void load()}>
          검색
        </button>
      </div>
      {error ? <p className="admin-error-banner">{error}</p> : null}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>매장명</th>
              <th>점주</th>
              <th>연락처</th>
              <th>지역</th>
              <th>승인일</th>
              <th>시도</th>
              <th>성사</th>
              <th>성사율</th>
              <th>최근 모집</th>
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
                <td>
                  {[row.sido, row.sigungu].filter(Boolean).join(' ') || '—'}
                </td>
                <td>{formatDate(row.approvedAt)}</td>
                <td>{row.kpi.attemptCount}</td>
                <td>{row.kpi.succeededCount}</td>
                <td>{formatKpiRate(row.kpi.successRatePercent)}</td>
                <td>{row.kpi.lastJoinAt ? formatDate(row.kpi.lastJoinAt) : '—'}</td>
                <td>{row.status}</td>
                <td>
                  <Link to={`/admin/stores/${row.ownershipId}`}>상세</Link>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={11}>승인 매장이 없습니다.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
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
      <div className="admin-page">
        <button type="button" onClick={() => navigate('/admin/stores')}>
          ← 목록
        </button>
        <p className="admin-error-banner">{error}</p>
      </div>
    );
  }
  if (!detail) {
    return <div className="admin-page">불러오는 중…</div>;
  }

  const { ownership: o, kpi } = { ownership: detail.ownership, kpi: detail.ownership.kpi };

  return (
    <div className="admin-page">
      <button type="button" onClick={() => navigate('/admin/stores')}>
        ← 목록
      </button>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{o.facilityName}</h1>
          <p className="admin-page-desc">승인 매장 상세 · KPI</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as AdminStoreKpiPeriod)}
        >
          <option value="all">전체 기간</option>
          <option value="30d">최근 30일</option>
          <option value="90d">최근 90일</option>
        </select>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <p>
          <strong>GolfFacility</strong> {o.golfFacilityId}
        </p>
        <p>
          <strong>점주</strong> {detail.applicantName ?? o.ownerName ?? '—'} ·{' '}
          {formatKoreanPhoneDisplay(detail.applicantPhone ?? o.ownerPhone) || '—'}
        </p>
        <p>
          <strong>주소</strong> {o.facilityAddress ?? '—'}
        </p>
        <p>
          <strong>승인일</strong> {formatDate(o.approvedAt)} · <strong>상태</strong>{' '}
          {o.status}
        </p>
        {detail.requestId ? (
          <p>
            <Link to={`/admin/store-verifications/${detail.requestId}`}>
              원본 인증 요청 보기
            </Link>
          </p>
        ) : null}
      </div>

      <div className="dash-kpi-grid" style={{ marginBottom: 16 }}>
        <div className="card dash-kpi-card">
          <div className="dash-kpi-label">모집 시도</div>
          <div className="dash-kpi-value">{kpi.attemptCount}</div>
        </div>
        <div className="card dash-kpi-card">
          <div className="dash-kpi-label">모집 성사</div>
          <div className="dash-kpi-value">{kpi.succeededCount}</div>
        </div>
        <div className="card dash-kpi-card">
          <div className="dash-kpi-label">모집 취소</div>
          <div className="dash-kpi-value">{kpi.cancelledCount}</div>
        </div>
        <div className="card dash-kpi-card">
          <div className="dash-kpi-label">성사율</div>
          <div className="dash-kpi-value">{formatKpiRate(kpi.successRatePercent)}</div>
        </div>
        <div className="card dash-kpi-card">
          <div className="dash-kpi-label">누적 참가</div>
          <div className="dash-kpi-value">{kpi.participantSum}</div>
        </div>
        <div className="card dash-kpi-card">
          <div className="dash-kpi-label">모집 중 / 예정 / 완료</div>
          <div className="dash-kpi-value">
            {kpi.recruitingCount} / {kpi.scheduledCount} / {kpi.completedCount}
          </div>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>최근 모집</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>시작</th>
              <th>상태</th>
              <th>정원</th>
              <th>확정</th>
              <th>참석</th>
              <th>성사</th>
            </tr>
          </thead>
          <tbody>
            {detail.recentJoins.map((j) => (
              <tr key={j.joinId}>
                <td>{formatDate(j.startAt)}</td>
                <td>{j.status}</td>
                <td>{j.plannedPlayerCount}</td>
                <td>{j.confirmedPlayerCount}</td>
                <td>{j.attendedCount ?? '—'}</td>
                <td>{j.succeeded ? 'Y' : 'N'}</td>
              </tr>
            ))}
            {detail.recentJoins.length === 0 ? (
              <tr>
                <td colSpan={6}>모집 이력이 없습니다.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
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
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">분쟁 관리</h1>
          <p className="admin-page-desc">조인 보상 분쟁을 검토하고 판정합니다.</p>
        </div>
        <div className="admin-page-actions">
          <select value={status} onChange={(e) => setStatus(e.target.value as DisputeStatus | '')}>
            <option value="">전체</option>
            <option value="OPEN">OPEN</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            새로고침
          </button>
        </div>
      </div>
      {error ? <p className="admin-error-banner">{error}</p> : null}
      <div className="dispute-list">
        {items.length === 0 && !error ? <p className="admin-empty">해당 조건의 분쟁이 없습니다.</p> : null}
        {items.map((d) => (
          <Link
            key={d.disputeId}
            to={`/admin/disputes/${d.disputeId}`}
            className="dispute-card-link"
          >
            <div className="card dispute-card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="dispute-card-title">{d.venueName}</span>
                {disputeStatusBadge(d.status)}
              </div>
              <div className="dispute-card-meta">
                {d.participantNickname} · {d.rewardAmount} Coin · {d.reasonType}
              </div>
            </div>
          </Link>
        ))}
      </div>
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

  if (!detail) {
    return (
      <div className="admin-page">
        <p className={error ? 'admin-error-banner' : 'admin-loading'}>{error ?? '불러오는 중…'}</p>
      </div>
    );
  }

  const payLabel = `참가자에게 ${detail.rewardAmount} Coin 지급`;
  const refundLabel = `방장에게 ${detail.rewardAmount} Coin 반환`;

  return (
    <div className="admin-page">
      <button type="button" className="btn-secondary admin-back" onClick={() => navigate('/admin/disputes')}>
        ← 목록
      </button>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">분쟁 상세</h1>
          <p className="admin-page-desc">호스트·참가자 설명을 확인한 뒤 판정합니다.</p>
        </div>
        <div>{disputeStatusBadge(detail.status)}</div>
      </div>

      <div className="card admin-section">
        <div className="admin-detail-grid">
          <div>
            <strong>{detail.venueName}</strong>
          </div>
          <div>
            Host {detail.hostNickname} · Participant {detail.participantNickname}
          </div>
          <div className="muted">
            Reward {detail.rewardAmount} · {detail.rewardStatus} · Hold {detail.holdStatus ?? '-'}
          </div>
          {detail.resolution ? <div>판정: {detail.resolution}</div> : null}
        </div>
      </div>

      <div className="card admin-section">
        <strong className="admin-section-title">Host 설명</strong>
        <p className="admin-section-desc">{detail.hostStatement ?? '(없음)'}</p>
        <strong className="admin-section-title" style={{ marginTop: 16 }}>
          Participant 설명
        </strong>
        <p className="admin-section-desc">{detail.participantStatement ?? '(없음)'}</p>
      </div>

      {detail.status !== DisputeStatus.RESOLVED ? (
        <div className="card admin-section">
          <strong className="admin-section-title">판정</strong>
          <p className="admin-section-desc">확정 후 변경할 수 없습니다.</p>
          <label style={{ marginTop: 12 }}>
            운영 메모 (내부)
            <textarea
              placeholder="운영 메모"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
            />
          </label>
          <div className="admin-page-actions" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => setConfirm(DisputeResolution.PAY_PARTICIPANT)}
            >
              {payLabel}
            </button>
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={() => setConfirm(DisputeResolution.REFUND_HOST)}
            >
              {refundLabel}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="admin-error-banner">{error}</p> : null}

      {confirm ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>판정 확정</h3>
            <p>{confirm === DisputeResolution.PAY_PARTICIPANT ? payLabel : refundLabel}</p>
            <p>확정 후 변경할 수 없습니다.</p>
            <div className="row">
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirm(null)}>
                취소
              </button>
              <button
                type="button"
                className={confirm === DisputeResolution.PAY_PARTICIPANT ? 'btn-primary' : 'danger'}
                disabled={busy}
                onClick={() => void resolve(confirm)}
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
          <button type="button" className="btn-secondary" disabled={busy} onClick={props.onClose}>
            취소
          </button>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void submit()}>
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
    <div className="coin-page">
      <div className="coin-page-header">
        <div>
          <h1 className="coin-page-title">코인 관리</h1>
          <p className="coin-page-desc">
            Coin 공급·발행·정합성을 확인합니다. 수동 발행은 신규 mint(ISSUANCE)이며 Transfer가 아닙니다.
          </p>
        </div>
        <div className="coin-page-actions">
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            새로고침
          </button>
          <button type="button" className="btn-primary" onClick={() => setGrantOpen(true)}>
            수동 발행
          </button>
        </div>
      </div>

      <div className="coin-filter-bar">
        <label className="coin-filter-check">
          <input
            type="checkbox"
            checked={excludeDevSeed}
            onChange={(e) => setExcludeDevSeed(e.target.checked)}
          />
          DEV_SEED 제외 (기간·breakdown)
        </label>
        <span className="coin-filter-divider" aria-hidden />
        <span
          className={
            excludeDevSeed ? 'coin-scope-badge coin-scope-badge--prod' : 'coin-scope-badge coin-scope-badge--all'
          }
        >
          {excludeDevSeed ? '운영 지표 기준' : '전체 데이터 기준'}
        </span>
        <p className="coin-filter-hint">
          {excludeDevSeed
            ? 'DEV_SEED 발행을 제외한 운영 지표입니다. 테스트/시드 데이터는 자동 초기화되지 않습니다.'
            : '현재 수치는 DEV_SEED 포함 기준입니다. 운영 지표를 보려면 DEV_SEED 제외를 켜세요.'}
        </p>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {kpi ? (
        <div className="coin-kpi-grid">
          <div className="card coin-kpi-card coin-kpi-card--issued">
            <div className="coin-kpi-label">총 누적 발행</div>
            <div className="coin-kpi-value">{formatCoin(kpi.totalIssued)}</div>
            <div className="coin-kpi-sub">
              운영 발행 {formatCoin(kpi.productionIssued)} — DEV_SEED·테스트 발행을 제외한 실제 운영 mint
            </div>
          </div>
          <div className="card coin-kpi-card coin-kpi-card--supply">
            <div className="coin-kpi-label">현재 유통</div>
            <div className="coin-kpi-value">{formatCoin(kpi.currentSupply)}</div>
            <div className="coin-kpi-sub">지갑에 존재하는 Coin 합계</div>
          </div>
          <div className="card coin-kpi-card coin-kpi-card--available">
            <div className="coin-kpi-label">사용 가능</div>
            <div className="coin-kpi-value">{formatCoin(kpi.totalAvailable)}</div>
            <div className="coin-kpi-sub">즉시 사용·이체 가능 잔액</div>
          </div>
          <div className="card coin-kpi-card coin-kpi-card--held">
            <div className="coin-kpi-label">홀드</div>
            <div className="coin-kpi-value">{formatCoin(kpi.totalHeld)}</div>
            <div className="coin-kpi-sub">조인·정산 등으로 잠긴 잔액</div>
          </div>
          <div className="card coin-kpi-card coin-kpi-card--burned">
            <div className="coin-kpi-label">누적 소멸</div>
            <div className="coin-kpi-value">{formatCoin(kpi.totalBurned)}</div>
            <div className="coin-kpi-sub">Burn으로 영구 제거된 Coin</div>
          </div>
          <div className="card coin-kpi-card coin-kpi-card--period">
            <div className="coin-kpi-label">오늘 / 이번 달 발행</div>
            <div className="coin-kpi-value">
              {formatCoin(kpi.todayIssued)} / {formatCoin(kpi.monthIssued)}
            </div>
            <div className="coin-kpi-sub">선택한 DEV_SEED 필터가 기간 집계에도 적용됩니다</div>
          </div>
        </div>
      ) : null}

      <div className="card coin-section">
        <div className="coin-section-header">
          <strong className="coin-section-title">발행 유형별 내역</strong>
          <p className="coin-section-desc">issuanceType별 누적 발행량 (현재 필터 기준)</p>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>유형</th>
              <th className="col-num">수량</th>
            </tr>
          </thead>
          <tbody>
            {(dash?.breakdown ?? []).map((b) => (
              <tr key={b.issuanceType}>
                <td>{b.issuanceType}</td>
                <td className="col-num">{formatCoin(b.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card coin-section">
        <div className="coin-section-header">
          <strong className="coin-section-title">공급 정합성</strong>
          <p className="coin-section-desc">
            장부(Issued − Burned)와 지갑(Available + Held) 합계가 일치하는지 확인합니다. 불일치 시 자동 수정하지
            않습니다.
          </p>
        </div>
        {recon ? (
          <div>
            <div className="coin-recon-lines">
              <p className="coin-recon-line">
                <strong>장부</strong> 발행 {formatCoin(recon.totalIssued)} − 소멸 {formatCoin(recon.totalBurned)} ={' '}
                {formatCoin(recon.currentSupplyFromBooks)}
              </p>
              <p className="coin-recon-line">
                <strong>지갑</strong> 사용 가능 {formatCoin(recon.totalAvailable)} + 홀드{' '}
                {formatCoin(recon.totalHeld)} = {formatCoin(recon.currentSupplyFromWallets)}
              </p>
            </div>
            <p
              className={
                recon.ok ? 'coin-recon-status coin-recon-status--ok' : 'coin-recon-status coin-recon-status--error'
              }
            >
              {recon.ok ? '정합성 OK' : `불일치 delta=${formatCoin(recon.delta)} (자동 수정 금지)`}
            </p>
          </div>
        ) : null}
      </div>

      <div className="card coin-section">
        <div className="coin-table-toolbar">
          <strong className="coin-section-title">발행 내역</strong>
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
              <th className="col-num">수량</th>
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
                  <Link to={`/admin/coin/users/${row.userId}`}>
                    {row.userNickname ?? row.userId.slice(0, 8)}
                  </Link>
                </td>
                <td className="col-num">+{formatCoin(row.amount)}</td>
                <td>{row.issuanceType}</td>
                <td>{row.reason ?? '—'}</td>
                <td>
                  {row.referenceType ?? '—'}
                  {row.referenceId ? ` / ${row.referenceId.slice(0, 12)}` : ''}
                </td>
                <td>{row.createdByLabel}</td>
                <td>
                  <Link to={`/admin/coin/issuances/${row.issuanceId}`}>상세</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card coin-section">
        <div className="coin-section-header">
          <strong className="coin-section-title">사용자 Coin History</strong>
          <p className="coin-section-desc">userId로 개별 사용자 잔액·누적 이력을 조회합니다.</p>
        </div>
        <div className="coin-user-lookup">
          <input
            placeholder="userId"
            value={userLookup}
            onChange={(e) => setUserLookup(e.target.value)}
          />
          <button type="button" className="btn-secondary" onClick={() => void lookupUser()}>
            조회
          </button>
        </div>
        {userHistory ? (
          <div className="coin-user-result">
            <p>
              {userHistory.nickname ?? userHistory.userId} · 사용 가능 {formatCoin(userHistory.availableCoin)} · 홀드{' '}
              {formatCoin(userHistory.heldCoin)}
            </p>
            <p>
              누적 발행 수령 {formatCoin(userHistory.lifetimeIssuedReceived)} · Transfer 수령{' '}
              {formatCoin(userHistory.lifetimeTransferReceived)} · Burn 기여{' '}
              {formatCoin(userHistory.lifetimeBurnContributed)}
            </p>
          </div>
        ) : null}
      </div>

      <p className="coin-ops-note">
        DEV_SEED 등 테스트 발행 데이터는 자동으로 삭제되지 않습니다. 운영 전 정리 정책에 따라 별도 처리하세요.
      </p>

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

  if (!detail) {
    return (
      <div className="admin-page">
        <p className={error ? 'admin-error-banner' : 'admin-loading'}>{error ?? '불러오는 중…'}</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <button type="button" className="btn-secondary admin-back" onClick={() => navigate('/admin/coin')}>
        ← 코인 관리
      </button>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">발행 상세</h1>
          <p className="admin-page-desc">Issuance ledger 기록</p>
        </div>
      </div>
      <div className="card admin-section">
        <div className="admin-detail-grid">
          <div>ID {detail.issuanceId}</div>
          <div>
            {detail.userNickname ?? detail.userId} · +{formatCoin(detail.amount)} · {detail.issuanceType}
          </div>
          <div className="muted">사유: {detail.reason ?? '—'}</div>
          <div className="muted">
            Reference: {detail.referenceType ?? '—'} / {detail.referenceId ?? '—'}
          </div>
          <div>
            처리자: {detail.createdByLabel} · {new Date(detail.createdAt).toLocaleString('ko-KR')}
          </div>
          <div>Ledger TX: {detail.ledgerTxId}</div>
          <div>Status: {detail.status}</div>
          {detail.metadata ? <pre>{JSON.stringify(detail.metadata, null, 2)}</pre> : null}
        </div>
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

  if (!detail) {
    return (
      <div className="admin-page">
        <p className={error ? 'admin-error-banner' : 'admin-loading'}>{error ?? '불러오는 중…'}</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <button type="button" className="btn-secondary admin-back" onClick={() => navigate('/admin/coin')}>
        ← 코인 관리
      </button>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">사용자 Coin</h1>
          <p className="admin-page-desc">{detail.nickname ?? detail.userId}</p>
        </div>
      </div>
      <div className="card admin-section">
        <div className="admin-detail-grid">
          <div>
            사용 가능 {formatCoin(detail.availableCoin)} · 홀드 {formatCoin(detail.heldCoin)}
          </div>
          <div className="muted">
            누적 발행 수령 {formatCoin(detail.lifetimeIssuedReceived)} (신규 mint만)
          </div>
          <div className="muted">
            누적 Transfer 수령 {formatCoin(detail.lifetimeTransferReceived)} (발행 아님)
          </div>
          <div className="muted">Burn 기여 {formatCoin(detail.lifetimeBurnContributed)}</div>
        </div>
      </div>
      <div className="card admin-section">
        <strong className="admin-section-title">최근 Ledger</strong>
        <div className="admin-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>일시</th>
                <th>유형</th>
                <th className="col-num">금액</th>
                <th>라벨</th>
              </tr>
            </thead>
            <tbody>
              {detail.recentTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.createdAt).toLocaleString('ko-KR')}</td>
                  <td>{tx.type}</td>
                  <td className="col-num">{formatCoin(tx.amount)}</td>
                  <td>{tx.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminApp() {
  return (
    <Shell>
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="coin" element={<CoinSupplyPage />} />
        <Route path="coin/issuances/:issuanceId" element={<IssuanceDetailPage />} />
        <Route path="coin/users/:userId" element={<UserCoinPage />} />
        <Route path="disputes" element={<DisputeListPage />} />
        <Route path="disputes/:disputeId" element={<DisputeDetailPage />} />
        <Route path="store-verifications" element={<StoreVerificationListPage />} />
        <Route path="store-verifications/:requestId" element={<StoreVerificationDetailPage />} />
        <Route path="stores" element={<ApprovedStoresPage />} />
        <Route path="stores/:ownershipId" element={<ApprovedStoreDetailPage />} />
      </Routes>
    </Shell>
  );
}
