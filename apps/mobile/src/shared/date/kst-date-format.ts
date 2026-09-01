import { composeKstIso } from '../../features/store/matching-join-ui';

/** User-facing selected date label — e.g. 2026. 09. 12 (토) */
export function formatKstDatePickerLabel(dateYmd: string): string {
  try {
    const iso = composeKstIso(dateYmd, '12:00');
    const parts = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    }).formatToParts(new Date(iso));
    const y = parts.find((p) => p.type === 'year')?.value ?? '';
    const m = parts.find((p) => p.type === 'month')?.value ?? '';
    const d = parts.find((p) => p.type === 'day')?.value ?? '';
    const w = parts.find((p) => p.type === 'weekday')?.value ?? '';
    return `${y}. ${m}. ${d} (${w})`;
  } catch {
    return dateYmd;
  }
}
