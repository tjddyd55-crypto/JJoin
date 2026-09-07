import { useEffect, useState } from 'react';
import type { PublicServiceOperatorProfileDto } from '@jjoin/types';

const API_URL = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '');

export function OperatorFooter() {
  const [profile, setProfile] = useState<PublicServiceOperatorProfileDto | null>(null);

  useEffect(() => {
    if (!API_URL) return;
    void fetch(`${API_URL}/public/service-operator-profile`, {
      headers: { Accept: 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PublicServiceOperatorProfileDto | null) => {
        if (data) setProfile(data);
      })
      .catch(() => {
        /* footer stays minimal when API unavailable */
      });
  }, []);

  const lines = profile?.displayLines ?? [];
  const brand = profile?.brandName?.trim();

  return (
    <footer className="footer">
      <p className="brand footer-brand">{brand || 'JJOINZONE'}</p>
      {lines.length > 0 ? (
        <div className="footer-legal">
          {lines.map((line) => (
            <p key={`${line.label}-${line.value}`} className="footer-legal-line">
              {line.label === '사업자' ? line.value : `${line.label} ${line.value}`}
            </p>
          ))}
          {profile?.customerServiceHours ? (
            <p className="footer-legal-line">운영시간 {profile.customerServiceHours}</p>
          ) : null}
        </div>
      ) : null}
      <p className="footer-copy">© {brand || 'JJOINZONE'}</p>
    </footer>
  );
}
