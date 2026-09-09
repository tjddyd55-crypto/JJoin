import { formatNumber } from '@jjoin/domain';

export function formatMallCoinKo(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '— 코인';
  return `${formatNumber(value)} 코인`;
}
