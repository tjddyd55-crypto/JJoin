import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DisputeResolution,
  DisputeStatus,
  type AdminDisputeDetailDto,
} from '@jjoin/types';
import { api, ApiError } from '../lib/api';
import { formatCoin, formatDateTime } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import { AdminStatusBadge } from '../components/AdminStatusBadge';
import { TextAreaField } from '../components/TextAreaField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DangerDialog } from '../components/DangerDialog';
import { useToast } from '../components/ToastProvider';
import { renderLoadError } from '../components/renderLoadError';

export function DisputeDetailPage() {
  const { disputeId } = useParams();
  const { pushToast } = useToast();
  const [detail, setDetail] = useState<AdminDisputeDetailDto | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [confirmPay, setConfirmPay] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);

  const load = useCallback(async () => {
    if (!disputeId) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await api.getAdminDispute(disputeId));
    } catch (e) {
      setError(e);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [disputeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(resolution: DisputeResolution) {
    if (!disputeId || busy) return;
    setBusy(true);
    try {
      await api.resolveAdminDispute(disputeId, {
        resolution,
        adminNote: adminNote || undefined,
      });
      pushToast('판정이 확정되었습니다', 'success');
      setConfirmPay(false);
      setConfirmRefund(false);
      await load();
    } catch (e) {
      pushToast(e instanceof ApiError ? e.message : '판정 실패', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !detail) {
    return renderLoadError(error ?? new Error('not_found'), () => void load());
  }

  const payLabel = `참가자에게 ${formatCoin(detail.rewardAmount)} Coin 지급`;
  const refundLabel = `방장에게 ${formatCoin(detail.rewardAmount)} Coin 반환`;
  const canResolve = detail.status !== DisputeStatus.RESOLVED;

  return (
    <div>
      <Link to="/disputes" className="back-link">
        ← 분쟁 목록
      </Link>
      <PageHeader title="분쟁 상세" description={detail.venueName} />

      <div className="section-card">
        <dl className="dl-grid">
          <dt>호스트</dt>
          <dd>{detail.hostNickname}</dd>
          <dt>참가자</dt>
          <dd>{detail.participantNickname}</dd>
          <dt>보상</dt>
          <dd>
            {formatCoin(detail.rewardAmount)} · {detail.rewardStatus} · Hold{' '}
            {detail.holdStatus ?? '—'}
          </dd>
          <dt>상태</dt>
          <dd>
            <AdminStatusBadge label={detail.status} tone="danger" />
            {detail.resolution ? ` · ${detail.resolution}` : ''}
          </dd>
          <dt>접수</dt>
          <dd>{formatDateTime(detail.openedAt)}</dd>
        </dl>
      </div>

      <div className="section-card">
        <h2>진술</h2>
        <p>
          <strong>Host</strong>
        </p>
        <p>{detail.hostStatement ?? '(없음)'}</p>
        <p>
          <strong>Participant</strong>
        </p>
        <p>{detail.participantStatement ?? '(없음)'}</p>
      </div>

      {canResolve ? (
        <div className="section-card">
          <h2>판정</h2>
          <TextAreaField
            label="운영 메모 (내부)"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
          <div className="row">
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => setConfirmPay(true)}
            >
              {payLabel}
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={busy}
              onClick={() => setConfirmRefund(true)}
            >
              {refundLabel}
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmPay}
        title="판정 확정"
        message={`${payLabel}. 확정 후 변경할 수 없습니다.`}
        confirmLabel="확정"
        busy={busy}
        onCancel={() => setConfirmPay(false)}
        onConfirm={() => void resolve(DisputeResolution.PAY_PARTICIPANT)}
      />
      <DangerDialog
        open={confirmRefund}
        title="환불 판정 확정"
        message={`${refundLabel}. 확정 후 변경할 수 없습니다.`}
        confirmLabel="확정"
        busy={busy}
        onCancel={() => setConfirmRefund(false)}
        onConfirm={() => void resolve(DisputeResolution.REFUND_HOST)}
      />
    </div>
  );
}
