import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  DisputeResolution,
  DisputeStatus,
  MockAuthPersona,
  SocialProvider,
  type AdminDisputeDetailDto,
  type AdminDisputeListItemDto,
} from '@jjoin/types';

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

function LoginBar() {
  const [busy, setBusy] = useState(false);
  async function signIn(persona: MockAuthPersona) {
    setBusy(true);
    try {
      const res = await api<{ session: { accessToken: string } }>('/auth/social/mock-sign-in', {
        method: 'POST',
        body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
      });
      localStorage.setItem(TOKEN_KEY, res.session.accessToken);
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="card row">
      <strong>Admin Login (mock)</strong>
      <button disabled={busy} onClick={() => void signIn(MockAuthPersona.DEV_ADMIN)}>
        DEV_ADMIN
      </button>
    </div>
  );
}

function DisputeListPage() {
  const [items, setItems] = useState<AdminDisputeListItemDto[]>([]);
  const [status, setStatus] = useState<DisputeStatus | ''>('OPEN');
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
      <LoginBar />
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
      <button onClick={() => navigate('/')}>← 목록</button>
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
            <p>
              {confirm === DisputeResolution.PAY_PARTICIPANT ? payLabel : refundLabel}
            </p>
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

export function App() {
  const token = useMemo(() => localStorage.getItem(TOKEN_KEY), []);
  return (
    <div className="layout">
      {!token ? <LoginBar /> : null}
      <Routes>
        <Route path="/" element={<DisputeListPage />} />
        <Route path="/disputes/:disputeId" element={<DisputeDetailPage />} />
      </Routes>
    </div>
  );
}
