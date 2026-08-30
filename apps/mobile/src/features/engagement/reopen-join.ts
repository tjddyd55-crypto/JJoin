import type { Href } from 'expo-router';
import { JoinKind, type JoinPrefillDto } from '@jjoin/types';

/** Navigate target after host "다시 모집" + getJoinPrefill. */
export function reopenJoinHref(prefill: JoinPrefillDto): Href {
  if (prefill.joinKind === JoinKind.STORE_MATCHING) {
    return {
      pathname: '/my/create-store-join',
      params: {
        storeOwnershipId: prefill.storeOwnershipId ?? '',
        sourceJoinId: prefill.sourceJoinId,
        plannedPlayerCount: String(prefill.plannedPlayerCount),
        targetMaleCount:
          prefill.targetMaleCount != null ? String(prefill.targetMaleCount) : '',
        targetFemaleCount:
          prefill.targetFemaleCount != null ? String(prefill.targetFemaleCount) : '',
        rewardPerParticipant: prefill.rewardPerParticipant,
        matchingRewardTarget: prefill.matchingRewardTarget ?? '',
        minimumPlayers:
          prefill.minimumPlayers != null ? String(prefill.minimumPlayers) : '',
        title: prefill.title ?? '',
        description: prefill.description ?? '',
      },
    } as Href;
  }

  return {
    pathname: '/(tabs)/create',
    params: {
      venueId: prefill.venueId,
      golfFacilityId: prefill.golfFacilityId ?? '',
      players: String(prefill.plannedPlayerCount),
      rewardPerParticipant: prefill.rewardPerParticipant,
      title: prefill.title ?? '',
      description: prefill.description ?? '',
      sourceJoinId: prefill.sourceJoinId,
    },
  } as Href;
}
