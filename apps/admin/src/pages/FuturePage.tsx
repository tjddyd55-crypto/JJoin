import { useLocation } from 'react-router-dom';
import { findNavItem } from '../config/navigation';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';

export function FuturePage() {
  const location = useLocation();
  const nav = findNavItem(location.pathname);
  const isMembership = location.pathname.startsWith('/memberships');

  return (
    <div>
      <PageHeader title={nav?.label ?? '준비 중'} />
      <div className="section-card">
        <EmptyState
          title="준비 중"
          description={
            isMembership
              ? '멤버십 SSOT 연결 예정. PREMIUM = ROOM_CREATION_FEE_WAIVER only (가짜 FREE/PREMIUM 플랜 없음).'
              : '알림 / 운영 기능은 이후 단계에서 연결됩니다.'
          }
        />
      </div>
    </div>
  );
}
