import {
  RECOMMEND_REASON_LABEL_KO,
  type RecommendReasonCode,
} from '@jjoin/domain';

/** Display label for recommendation reason — never expose score. */
export function recommendReasonLabel(code: RecommendReasonCode): string {
  return RECOMMEND_REASON_LABEL_KO[code];
}
