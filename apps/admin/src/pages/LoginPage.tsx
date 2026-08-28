import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { useToast } from '../components/ToastProvider';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setBusy(true);
    setError(null);
    try {
      await login();
      pushToast('관리자로 로그인했습니다', 'success');
      navigate('/', { replace: true });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : '로그인에 실패했습니다';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>
          <span className="brand-mark">JJOIN</span> HQ
        </h1>
        <p>운영 콘솔 · mock DEV_ADMIN 로그인</p>
        {error ? <p className="text-danger">{error}</p> : null}
        <button
          type="button"
          className="btn-primary"
          style={{ width: '100%' }}
          disabled={busy}
          onClick={() => void handleLogin()}
        >
          {busy ? '로그인 중…' : 'DEV_ADMIN으로 로그인'}
        </button>
      </div>
    </div>
  );
}
