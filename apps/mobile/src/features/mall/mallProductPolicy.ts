import type { MallProductDetailDto } from '@jjoin/types';

export type MallPolicyRow = {
  key: string;
  label: string;
  body: string;
};

function row(key: string, label: string, body: string | null | undefined): MallPolicyRow | null {
  const trimmed = body?.trim();
  if (!trimmed) return null;
  return { key, label, body: trimmed };
}

/** Product-specific policy rows; empty fields are omitted. */
export function buildMallPolicyRows(product: MallProductDetailDto): MallPolicyRow[] {
  return [
    row('usage', '사용 방법', product.usageGuide),
    row('validity', '유효기간', product.validityGuide),
    row('exchangeRefund', '교환 · 환불 정책', product.exchangeRefundGuide),
    row('notice', '주의사항', product.noticeGuide),
  ].filter((item): item is MallPolicyRow => item !== null);
}
