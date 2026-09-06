/**
 * Join waitlist domain — extends JoinParticipant lifecycle (FIFO + time-limited offers).
 * Server SSOT for capacity, gender slots, and promotion.
 */

import {
  canApplyMatchingGenderSlot,
  countMatchingRosterByGender,
  type MatchingGender,
} from './store-matching';

/** Default offer TTL when product policy is unset. */
export const WAITLIST_OFFER_TTL_MINUTES = 30;

export const WAITLIST_ACTIVE_STATUSES = ['WAITLISTED', 'OFFERED'] as const;
export type WaitlistActiveStatus = (typeof WAITLIST_ACTIVE_STATUSES)[number];

export const WAITLIST_TERMINAL_STATUSES = [
  'CANCELLED',
  'WAITLIST_EXPIRED',
] as const;

export function isWaitlistActiveStatus(status: string): boolean {
  return (WAITLIST_ACTIVE_STATUSES as readonly string[]).includes(status);
}

export function isBlockingWaitlistReapplyStatus(status: string): boolean {
  return status === 'WAITLISTED' || status === 'OFFERED';
}

export function computeWaitlistOfferExpiresAt(
  offeredAt: Date,
  ttlMinutes: number = WAITLIST_OFFER_TTL_MINUTES,
): Date {
  return new Date(offeredAt.getTime() + ttlMinutes * 60_000);
}

export function isWaitlistOfferActive(params: {
  status: string;
  offerExpiresAt: Date | null;
  now: Date;
}): boolean {
  if (params.status !== 'OFFERED') return false;
  if (!params.offerExpiresAt) return false;
  return params.offerExpiresAt.getTime() > params.now.getTime();
}

export type WaitlistParticipantRow = {
  participantId: string;
  userId: string;
  participationStatus: string;
  appliedAt: Date;
  gender?: MatchingGender | null;
};

/** Confirmed roster seats (not waitlist / not reserved offers). */
export function countConfirmedRosterParticipants(
  participants: Array<{ role: string; participationStatus: string }>,
): number {
  return participants.filter(
    (p) =>
      p.role !== 'HOST' &&
      (p.participationStatus === 'APPROVED' || p.participationStatus === 'CONFIRMED'),
  ).length;
}

/** Occupied join slots — HOST + APPROVED/CONFIRMED + active OFFERED reservations. */
export function countOccupiedJoinSlots(
  participants: Array<{ role: string; participationStatus: string }>,
): number {
  const confirmedRoster = participants.filter(
    (p) =>
      p.participationStatus === 'APPROVED' || p.participationStatus === 'CONFIRMED',
  ).length;
  return confirmedRoster + countActiveWaitlistOffers(participants);
}

export function countActiveWaitlistOffers(
  participants: Array<{ participationStatus: string }>,
): number {
  return participants.filter((p) => p.participationStatus === 'OFFERED').length;
}

export type EffectiveCapacitySnapshot = {
  confirmedCount: number;
  reservedOfferCount: number;
  totalOccupied: number;
  remainingGeneralSlots: number;
};

export function computeEffectiveCapacity(params: {
  plannedPlayerCount: number;
  participants: Array<{ role: string; participationStatus: string }>;
}): EffectiveCapacitySnapshot {
  const confirmedCount = countConfirmedRosterParticipants(params.participants);
  const reservedOfferCount = countActiveWaitlistOffers(params.participants);
  const totalOccupied = countOccupiedJoinSlots(params.participants);
  const remainingGeneralSlots = Math.max(0, params.plannedPlayerCount - totalOccupied);
  return {
    confirmedCount,
    reservedOfferCount,
    totalOccupied,
    remainingGeneralSlots,
  };
}

export function canDirectJoinGeneralCapacity(params: {
  plannedPlayerCount: number;
  participants: Array<{ role: string; participationStatus: string }>;
}): boolean {
  return computeEffectiveCapacity(params).remainingGeneralSlots > 0;
}

export type GenderSlotSnapshot = {
  confirmedGenders: MatchingGender[];
  reservedOfferGenders: MatchingGender[];
};

export function buildGenderSlotSnapshot(
  participants: Array<{
    role: string;
    participationStatus: string;
    gender?: MatchingGender | null;
  }>,
): GenderSlotSnapshot {
  const confirmedGenders = participants
    .filter(
      (p) =>
        p.role !== 'HOST' &&
        (p.participationStatus === 'APPROVED' || p.participationStatus === 'CONFIRMED'),
    )
    .map((p) => p.gender ?? null);

  const reservedOfferGenders = participants
    .filter((p) => p.role !== 'HOST' && p.participationStatus === 'OFFERED')
    .map((p) => p.gender ?? null);

  return { confirmedGenders, reservedOfferGenders };
}

/** Gender slot open when confirmed + reserved offers still leave room for applicant. */
export function canDirectJoinGenderSlot(params: {
  applicantGender: MatchingGender;
  targetMaleCount: number;
  targetFemaleCount: number;
  participants: Array<{
    role: string;
    participationStatus: string;
    gender?: MatchingGender | null;
  }>;
}): boolean {
  const { confirmedGenders, reservedOfferGenders } = buildGenderSlotSnapshot(
    params.participants,
  );
  const combined = [...confirmedGenders, ...reservedOfferGenders];
  return canApplyMatchingGenderSlot({
    applicantGender: params.applicantGender,
    targetMaleCount: params.targetMaleCount,
    targetFemaleCount: params.targetFemaleCount,
    confirmedGenders: combined,
  });
}

export function canJoinWaitlistGeneral(params: {
  plannedPlayerCount: number;
  participants: Array<{ role: string; participationStatus: string }>;
}): boolean {
  return !canDirectJoinGeneralCapacity(params);
}

export function canJoinWaitlistForGender(params: {
  applicantGender: MatchingGender;
  targetMaleCount: number;
  targetFemaleCount: number;
  plannedPlayerCount: number;
  participants: Array<{
    role: string;
    participationStatus: string;
    gender?: MatchingGender | null;
  }>;
}): boolean {
  if (canDirectJoinGenderSlot(params)) return false;
  // Gender slot full for this applicant — waitlist allowed even if other slots open.
  const { confirmedGenders, reservedOfferGenders } = buildGenderSlotSnapshot(
    params.participants,
  );
  const combined = [...confirmedGenders, ...reservedOfferGenders];
  return !canApplyMatchingGenderSlot({
    applicantGender: params.applicantGender,
    targetMaleCount: params.targetMaleCount,
    targetFemaleCount: params.targetFemaleCount,
    confirmedGenders: combined,
  });
}

export function computeWaitlistPosition(
  waitlisted: WaitlistParticipantRow[],
  participantId: string,
): number | null {
  const active = waitlisted
    .filter((w) => w.participationStatus === 'WAITLISTED')
    .sort((a, b) => a.appliedAt.getTime() - b.appliedAt.getTime());
  const idx = active.findIndex((w) => w.participantId === participantId);
  return idx >= 0 ? idx + 1 : null;
}

export function countAvailablePromotionSlots(params: {
  plannedPlayerCount: number;
  participants: Array<{
    role: string;
    participationStatus: string;
    gender?: MatchingGender | null;
  }>;
  targetMaleCount?: number;
  targetFemaleCount?: number;
  useGenderSlots: boolean;
}): number {
  if (!params.useGenderSlots) {
    return computeEffectiveCapacity({
      plannedPlayerCount: params.plannedPlayerCount,
      participants: params.participants,
    }).remainingGeneralSlots;
  }

  const { confirmedGenders, reservedOfferGenders } = buildGenderSlotSnapshot(
    params.participants,
  );
  const combined = countMatchingRosterByGender([
    ...confirmedGenders,
    ...reservedOfferGenders,
  ]);
  const maleRoom = Math.max(0, (params.targetMaleCount ?? 0) - combined.male);
  const femaleRoom = Math.max(0, (params.targetFemaleCount ?? 0) - combined.female);
  const totalRoom = Math.max(
    0,
    params.plannedPlayerCount - combined.total - countActiveWaitlistOffers(params.participants),
  );
  return Math.min(totalRoom, maleRoom + femaleRoom);
}

/** Pick next WAITLISTED rows to offer (FIFO), respecting gender slot availability per offer. */
export function selectNextWaitlistOffers(params: {
  waitlisted: WaitlistParticipantRow[];
  participants: Array<{
    role: string;
    participationStatus: string;
    gender?: MatchingGender | null;
  }>;
  plannedPlayerCount: number;
  targetMaleCount?: number;
  targetFemaleCount?: number;
  useGenderSlots: boolean;
  maxOffers: number;
}): WaitlistParticipantRow[] {
  if (params.maxOffers <= 0) return [];

  const queue = params.waitlisted
    .filter((w) => w.participationStatus === 'WAITLISTED')
    .sort((a, b) => a.appliedAt.getTime() - b.appliedAt.getTime());

  const selected: WaitlistParticipantRow[] = [];
  let simulatedParticipants = [...params.participants];

  for (const candidate of queue) {
    if (selected.length >= params.maxOffers) break;

    if (params.useGenderSlots) {
      const gender = candidate.gender ?? null;
      if (
        !gender ||
        !canDirectJoinGenderSlot({
          applicantGender: gender,
          targetMaleCount: params.targetMaleCount ?? 0,
          targetFemaleCount: params.targetFemaleCount ?? 0,
          participants: simulatedParticipants,
        })
      ) {
        continue;
      }
    } else if (
      !canDirectJoinGeneralCapacity({
        plannedPlayerCount: params.plannedPlayerCount,
        participants: simulatedParticipants,
      })
    ) {
      break;
    }

    selected.push(candidate);
    simulatedParticipants.push({
      role: 'PARTICIPANT',
      participationStatus: 'OFFERED',
      gender: candidate.gender ?? null,
    });
  }

  return selected;
}

export function isJoinWaitlistJoinable(params: {
  status: string;
  recruitClosesAt?: Date | null;
  now: Date;
}): boolean {
  if (params.status === 'CANCELLED' || params.status === 'COMPLETED') return false;
  if (params.recruitClosesAt && params.recruitClosesAt.getTime() <= params.now.getTime()) {
    return false;
  }
  return params.status === 'OPEN' || params.status === 'FULL';
}

export function canAcceptWaitlistOffer(params: {
  status: string;
  offerExpiresAt: Date | null;
  joinStatus: string;
  recruitClosesAt?: Date | null;
  now: Date;
}): { ok: true } | { ok: false; reason: string } {
  if (!isWaitlistOfferActive(params)) {
    return { ok: false, reason: 'offer_expired' };
  }
  if (params.joinStatus === 'CANCELLED' || params.joinStatus === 'COMPLETED') {
    return { ok: false, reason: 'join_closed' };
  }
  if (
    params.recruitClosesAt &&
    params.recruitClosesAt.getTime() <= params.now.getTime()
  ) {
    return { ok: false, reason: 'deadline_passed' };
  }
  return { ok: true };
}
