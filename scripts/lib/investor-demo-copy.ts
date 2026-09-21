/**
 * UI-visible Korean copy pools. Internal tags never appear here.
 * Callers pick by a stable key so re-seeds stay deterministic.
 */

const FORBIDDEN_UI_PATTERNS = [
  /\bdemo\b/i,
  /\btest\b/i,
  /\bsample\b/i,
  /데모/,
  /\[INVESTOR-DEMO\]/,
];

export function assertSafeUiCopy(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`empty_ui_copy ${label}`);
  for (const pattern of FORBIDDEN_UI_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error(`forbidden_ui_copy ${label}: ${trimmed}`);
    }
  }
  return trimmed;
}

export function hashKey(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickFromPool<T>(pool: readonly T[], key: string): T {
  if (pool.length === 0) throw new Error('empty_copy_pool');
  return pool[hashKey(key) % pool.length]!;
}

export const SCREEN_JOIN_TITLES = [
  '퇴근하고 바로 한 게임',
  '오늘 저녁 스크린 번개',
  '평일 야간 라운드 구해요',
  '가볍게 나인홀만',
  '초보 환영 저녁 타임',
  '중급끼리 편하게',
  '불금 스크린 한 판',
  '주말 오전 연습 라운드',
  '토요일 오후 스크린',
  '일요일 아침에 몸 풀기',
  '심야 한 게임 하실 분',
  '매너 라운드만 모집합니다',
  '자리 하나 비었어요',
  '갑자기 빈 방 채워요',
  '주차 편한 매장에서',
  '샤워 가능한 매장입니다',
  '1인 연습 겸 조인',
  '스코어 신경 안 써요',
  '친선으로 천천히',
  '티오프 맞춰서 바로 시작',
  '강남 근처 저녁 스크린',
  '분당에서 한 타임',
  '수원 쪽 퇴근 라운드',
  '송도에서 야간 한 게임',
  '잠실 근처 스크린',
  '일산 호수 쪽 번개',
  '동탄 저녁 타임',
  '수지에서 주말 오전',
] as const;

export const FIELD_JOIN_TITLES = [
  '주말 오전 티오프',
  '새벽 첫 타임 구합니다',
  '레이스 아닌 친선 라운드',
  '그린피 각자, 카트 더치',
  '4인 스퀘어 한 자리',
  '3인 모였고 한 분 더',
  '평일 오전 필드',
  '다음 주 주말 부킹',
  '바다 코스 바람 맞으며',
  '산악 코스 천천히',
  '카트 포함 라운드',
  '캐디 없이 셀프',
  '핸디 크게 안 가립니다',
  '초중급 환영합니다',
  '정시 티오프만 부탁드려요',
  '비 오면 다음으로 미룰게요',
  '주중 오전에 한 바퀴',
  '주말 오후 티타임',
  '수도권 실코스 모집',
  '지방 라운드 같이 가실 분',
] as const;

export const SCREEN_JOIN_BODIES = [
  '초보·중급 환영합니다. 매너 라운드로 편하게 칩시다.',
  '스코어보다 분위기 우선이에요. 정시에 모여서 바로 시작해요.',
  '퇴근 후 한 게임이면 충분합니다. 샤워·주차 됩니다.',
  '자리 남아서 올립니다. 부담 없이 들어와 주세요.',
  '친선만 합니다. 내기 없어요.',
  '처음이어도 괜찮아요. 클럽 세팅 도와드릴게요.',
  '중급 위주로 템포 맞춰요. 너무 늦지만 않게.',
  '심야 타임입니다. 조용히 한 게임 하실 분.',
  '주말 오전에 몸 풀고 끝낼게요.',
  '불금이라 가볍게만 칩니다.',
] as const;

export const FIELD_JOIN_BODIES = [
  '그린피는 각자, 카트는 더치로 정산합니다.',
  '티오프 맞춰서 클럽하우스에서 만나요.',
  '캐디 없이 셀프로 천천히 돌 예정입니다.',
  '비 예보 있으면 전날 밤에 공지하겠습니다.',
  '핸디 크게 안 가립니다. 매너만 지켜 주세요.',
  '4인 스퀘어로 부킹해 두었습니다.',
  '새벽 첫 타임이라 일찍 나와야 합니다.',
  '주말 오전 코스입니다. 여유 있게 오세요.',
  '카트 포함이고 식사 강요 없습니다.',
  '지방 라운드라 자차 이동입니다.',
] as const;

export const SCREEN_STORE_INTROS = [
  '야간 라운딩 맛집 · 주차·샤워 완비',
  '조용한 연습 공간 · 1인 부킹 가능',
  '가족 라운드 추천 · 주말 오전 오픈',
  '심야 오픈 · 퇴근 후 한 게임',
  '룸 간격 넓고 환기 잘 됩니다',
  '시뮬레이터 신형 · 타석 깨끗합니다',
  '라운지에서 대기하기 편해요',
  '평일 저녁 타임 자리 여유 있습니다',
  '주말에도 대기 길지 않은 편입니다',
  '왼손 타석 있어요',
] as const;

export const SCREEN_STORE_VIBES = [
  '밝고 편한 분위기',
  '차분한 연습실',
  '가족 친화',
  '심야 라운지',
  '또래끼리 편한 곳',
  '호스트 매너 좋은 매장',
  '조용히 치는 편',
  '이야기하며 치는 분위기',
] as const;

export const CLUB_INTROS = [
  '주말 필드와 평일 스크린을 같이 맞추는 공개 클럽입니다.',
  '퇴근 후 스크린을 자주 여는 저녁 모임입니다.',
  '수도권 실코스 부킹을 함께 잡습니다.',
  '초중급 위주로 천천히 치는 공개 모임입니다.',
  '주말 오전 티오프를 고정으로 잡습니다.',
] as const;
