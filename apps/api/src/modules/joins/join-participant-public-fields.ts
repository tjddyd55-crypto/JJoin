import { applyProfilePrivacy } from '@jjoin/domain';
import { SCREEN_GOLF_CODE } from '@jjoin/types';

export type JoinParticipantSportProfile = {
  fieldHandicap?: number | null;
  screenHandicap?: number | null;
  sport?: { code?: string } | null;
};

export type JoinParticipantPublicFields = {
  age: number | null;
  fieldHandicap: number | null;
  screenHandicap: number | null;
};

export function pickJoinParticipantGolfHandicaps(
  sportProfiles: JoinParticipantSportProfile[] | null | undefined,
): { fieldHandicap: number | null; screenHandicap: number | null } {
  const preferred =
    sportProfiles?.find((sp) => sp.sport?.code === SCREEN_GOLF_CODE) ?? sportProfiles?.[0];
  return {
    fieldHandicap: preferred?.fieldHandicap ?? null,
    screenHandicap: preferred?.screenHandicap ?? null,
  };
}

/**
 * Join roster rows reuse public-profile privacy toggles.
 * Birthdate / birth year are never accepted here.
 */
export function resolveJoinParticipantPublicFields(input: {
  age?: number | null;
  fieldHandicap?: number | null;
  screenHandicap?: number | null;
  showAge?: boolean | null;
  showHandicap?: boolean | null;
  isOwner: boolean;
}): JoinParticipantPublicFields {
  const visible = applyProfilePrivacy(
    {
      age: input.age ?? null,
      fieldHandicap: input.fieldHandicap ?? null,
      screenHandicap: input.screenHandicap ?? null,
    },
    {
      showAge: input.showAge ?? true,
      showHeight: true,
      showDrinking: true,
      showSmoking: true,
      showHandicap: input.showHandicap ?? true,
    },
    input.isOwner,
  );
  return {
    age: visible.age ?? null,
    fieldHandicap: visible.fieldHandicap ?? null,
    screenHandicap: visible.screenHandicap ?? null,
  };
}
