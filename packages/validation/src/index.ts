import { z } from 'zod';

export const nicknameSchema = z
  .string()
  .trim()
  .min(2)
  .max(20)
  .regex(/^[\p{L}\p{N}_.-]+$/u, 'invalid_nickname');

export const profileSetupSchema = z.object({
  nickname: nicknameSchema,
  gender: z.enum(['MALE', 'FEMALE', 'UNSPECIFIED', 'OTHER']),
  ageBand: z.enum(['TEENS', 'TWENTIES', 'THIRTIES', 'FORTIES', 'FIFTIES_PLUS', 'UNSPECIFIED']),
  regionLabel: z.string().trim().min(1).max(80),
  bio: z.string().trim().max(200).optional().or(z.literal('')),
  sportCode: z.string().default('SCREEN_GOLF'),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO']),
});

export type ProfileSetupInput = z.infer<typeof profileSetupSchema>;

export const profileEditSchema = z.object({
  nickname: nicknameSchema.optional(),
  regionLabel: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(200).optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'UNSPECIFIED', 'OTHER']).optional(),
  ageBand: z
    .enum(['TEENS', 'TWENTIES', 'THIRTIES', 'FORTIES', 'FIFTIES_PLUS', 'UNSPECIFIED'])
    .optional(),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO']).optional(),
  sportCode: z.string().default('SCREEN_GOLF'),
  avatarUrl: z.string().url().nullable().optional(),
});

export type ProfileEditInput = z.infer<typeof profileEditSchema>;

export const termsConsentSchema = z.object({
  termsOfService: z.literal(true),
  privacy: z.literal(true),
  identity: z.literal(true),
  location: z.literal(true),
  marketing: z.boolean().default(false),
});

export type TermsConsentInput = z.infer<typeof termsConsentSchema>;

export const activateVenueSchema = z.object({
  provider: z.enum(['KAKAO', 'MOCK']),
  providerPlaceId: z.string().trim().min(1).max(64),
  resolveHint: z
    .object({
      latitude: z.number().finite().gte(-90).lte(90),
      longitude: z.number().finite().gte(-180).lte(180),
      query: z.string().trim().min(1).max(80).optional(),
      sportCode: z.string().trim().min(1).max(40).optional(),
    })
    .optional(),
});

export type ActivateVenueInput = z.infer<typeof activateVenueSchema>;

export const createJoinSchema = z
  .object({
    sportCode: z.string().trim().min(1).default('SCREEN_GOLF'),
    venueId: z.string().uuid().optional(),
    venue: z
      .object({
        provider: z.string().trim().min(1),
        providerPlaceId: z.string().trim().min(1),
        name: z.string().trim().min(1).max(120),
        address: z.string().trim().max(200).nullable().optional(),
        regionLabel: z.string().trim().max(80).nullable().optional(),
        latitude: z.number().finite().gte(-90).lte(90),
        longitude: z.number().finite().gte(-180).lte(180),
      })
      .optional(),
    startAt: z.string().min(1),
    plannedPlayerCount: z.number().int().min(2).max(8),
    joinMethod: z.enum(['OPEN', 'APPROVAL']),
    title: z.string().trim().max(80).nullable().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    /** Host reward per participant — fee is never accepted from client. */
    rewardPerParticipant: z
      .string()
      .regex(/^\d+(\.\d{1,4})?$/)
      .optional(),
    idempotencyKey: z.string().trim().min(8).max(120).optional(),
    clubId: z.string().uuid().optional(),
    clubEventId: z.string().uuid().optional(),
  })
  .refine((v) => Boolean(v.venueId || v.venue), {
    message: 'venue_or_venueId_required',
  });

export type CreateJoinInput = z.infer<typeof createJoinSchema>;

export const joinCoinPreviewSchema = z.object({
  plannedPlayerCount: z.number().int().min(2).max(8),
  rewardPerParticipant: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/)
    .optional(),
});

export type JoinCoinPreviewInput = z.infer<typeof joinCoinPreviewSchema>;

export const registerPushDeviceSchema = z.object({
  pushToken: z
    .string()
    .trim()
    .min(16)
    .max(512)
    .regex(/^(ExponentPushToken\[.+\]|ExpoPushToken\[.+\]|[A-Za-z0-9_.:-]{16,})$/),
  platform: z.enum(['ANDROID', 'IOS', 'WEB']),
  deviceId: z.string().trim().min(1).max(128).nullable().optional(),
  appVariant: z.enum(['development', 'production']).optional(),
});

export type RegisterPushDeviceInput = z.infer<typeof registerPushDeviceSchema>;
/** @deprecated alias — prefer registerPushDeviceSchema */
export const registerPushDeviceSchemaAlias = registerPushDeviceSchema;

export const notificationPreferenceSchema = z.object({
  pushEnabled: z.boolean().optional(),
  joinAlertsEnabled: z.boolean().optional(),
  followedStoreEnabled: z.boolean().optional(),
  urgentJoinEnabled: z.boolean().optional(),
  invitationEnabled: z.boolean().optional(),
  attendanceReminderEnabled: z.boolean().optional(),
  bookmarkUpdatesEnabled: z.boolean().optional(),
});

export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>;
/** @deprecated alias */
export const notificationPreferenceSchemaAlias = notificationPreferenceSchema;

export const productEventBatchSchema = z.object({
  events: z
    .array(
      z.object({
        eventType: z.enum([
          'SHARE_LINK_CREATED',
          'SHARE_LINK_OPENED',
          'SHARE_JOIN_CTA_CLICKED',
          'RECOMMENDATION_IMPRESSION',
          'RECOMMENDATION_CLICK',
          'RECOMMENDATION_JOINED',
          'FOLLOWED_STORE_NEW_JOIN_SENT',
          'FOLLOWED_STORE_JOIN_CLICK',
          'FOLLOWED_STORE_JOINED',
          'URGENT_JOIN_OPENED',
          'URGENT_JOIN_VIEWED',
          'URGENT_JOIN_JOINED',
          'URGENT_JOIN_FILLED',
          'RECURRING_OCCURRENCE_CREATED',
          'RECURRING_JOIN_FILLED',
          'JOIN_INVITATION_SENT',
          'JOIN_INVITATION_ACCEPTED',
        ]),
        joinId: z.string().uuid().optional(),
        golfFacilityId: z.string().uuid().optional(),
        source: z.string().trim().min(1).max(32).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        dedupeKey: z.string().trim().min(1).max(200).optional(),
      }),
    )
    .min(1)
    .max(50),
});

export type ProductEventBatchInput = z.infer<typeof productEventBatchSchema>;

export const createStoreOwnershipRequestSchema = z.object({
  golfFacilityId: z.string().uuid(),
  applicantName: z.string().trim().min(1).max(80),
  applicantPhone: z.string().trim().min(8).max(20),
  relation: z.enum(['REPRESENTATIVE', 'OWNER', 'MANAGER', 'OTHER']),
  memo: z.string().trim().max(500).optional(),
  businessRegistrationNo: z.string().trim().min(1).max(20).optional(),
});

export type CreateStoreOwnershipRequestInput = z.infer<typeof createStoreOwnershipRequestSchema>;

export const createStoreMatchingJoinSchema = z
  .object({
    storeOwnershipId: z.string().uuid(),
    startAt: z.string().min(1),
    recruitClosesAt: z.string().min(1),
    targetMaleCount: z.number().int().min(0).max(4),
    targetFemaleCount: z.number().int().min(0).max(4),
    minimumPlayers: z.number().int().min(2).max(4),
    matchingRewardTarget: z.enum(['FEMALE', 'MALE', 'ALL']),
    rewardPerParticipant: z.string().regex(/^\d+(\.\d{1,4})?$/),
    title: z.string().trim().max(80).nullable().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    idempotencyKey: z.string().trim().min(8).max(120).optional(),
    recurringScheduleId: z.string().uuid().optional(),
    recurringOccurrenceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .refine((v) => v.targetMaleCount + v.targetFemaleCount >= 1, {
    message: 'matching_roster_required',
  })
  .refine((v) => v.targetMaleCount + v.targetFemaleCount <= 4, {
    message: 'matching_roster_max_four',
  })
  .refine((v) => v.minimumPlayers <= v.targetMaleCount + v.targetFemaleCount, {
    message: 'minimum_exceeds_planned',
  });

export type CreateStoreMatchingJoinInput = z.infer<typeof createStoreMatchingJoinSchema>;

const recurringRosterFields = {
  dayOfWeek: z.number().int().min(1).max(7),
  startTimeLocal: z
    .string()
    .regex(/^([01]?\d|2[0-3]):[0-5]\d$/),
  targetMaleCount: z.number().int().min(0).max(4),
  targetFemaleCount: z.number().int().min(0).max(4),
  minimumPlayers: z.number().int().min(2).max(4),
  matchingRewardTarget: z.enum(['FEMALE', 'MALE', 'ALL']),
  rewardPerParticipant: z.string().regex(/^\d+(\.\d{1,4})?$/),
  title: z.string().trim().max(80).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  recruitClosesHoursBefore: z.number().int().min(1).max(72).optional(),
};

export const createRecurringJoinScheduleSchema = z
  .object({
    storeOwnershipId: z.string().uuid(),
    ...recurringRosterFields,
  })
  .refine((v) => v.targetMaleCount + v.targetFemaleCount >= 1, {
    message: 'matching_roster_required',
  })
  .refine((v) => v.targetMaleCount + v.targetFemaleCount <= 4, {
    message: 'matching_roster_max_four',
  })
  .refine((v) => v.minimumPlayers <= v.targetMaleCount + v.targetFemaleCount, {
    message: 'minimum_exceeds_planned',
  });

export type CreateRecurringJoinScheduleInput = z.infer<
  typeof createRecurringJoinScheduleSchema
>;

export const updateRecurringJoinScheduleSchema = z
  .object({
    dayOfWeek: z.number().int().min(1).max(7).optional(),
    startTimeLocal: z
      .string()
      .regex(/^([01]?\d|2[0-3]):[0-5]\d$/)
      .optional(),
    targetMaleCount: z.number().int().min(0).max(4).optional(),
    targetFemaleCount: z.number().int().min(0).max(4).optional(),
    minimumPlayers: z.number().int().min(2).max(4).optional(),
    matchingRewardTarget: z.enum(['FEMALE', 'MALE', 'ALL']).optional(),
    rewardPerParticipant: z.string().regex(/^\d+(\.\d{1,4})?$/).optional(),
    title: z.string().trim().max(80).nullable().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    recruitClosesHoursBefore: z.number().int().min(1).max(72).optional(),
  })
  .refine(
    (v) => {
      const male = v.targetMaleCount;
      const female = v.targetFemaleCount;
      if (male === undefined && female === undefined) return true;
      if (male === undefined || female === undefined) return true;
      return male + female >= 1 && male + female <= 4;
    },
    { message: 'matching_roster_invalid' },
  );

export type UpdateRecurringJoinScheduleInput = z.infer<
  typeof updateRecurringJoinScheduleSchema
>;

export const skipRecurringJoinOccurrenceSchema = z.object({
  occurrenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type SkipRecurringJoinOccurrenceInput = z.infer<
  typeof skipRecurringJoinOccurrenceSchema
>;

export const storeMatchingCompleteSchema = z.object({
  attendance: z
    .array(
      z.object({
        participantId: z.string().uuid(),
        attended: z.boolean(),
      }),
    )
    .min(1),
});

export type StoreMatchingCompleteInput = z.infer<typeof storeMatchingCompleteSchema>;

export const rejectStoreVerificationSchema = z.object({
  rejectReason: z.string().trim().min(1).max(500),
  adminNote: z.string().trim().max(500).optional(),
});

export type RejectStoreVerificationInput = z.infer<typeof rejectStoreVerificationSchema>;

export const createClubSchema = z.object({
  name: z.string().trim().min(2).max(40),
  coverImageUrl: z.string().trim().url().max(500).nullable().optional(),
  intro: z.string().trim().max(120).nullable().optional(),
  /** Legacy single region — optional when activityRegions provided. */
  region: z.string().trim().min(1).max(80).optional(),
  activityRegions: z
    .array(
      z.object({
        sido: z.string().trim().min(1).max(40),
        sigungu: z.string().trim().min(1).max(40),
        parentSigungu: z.string().trim().max(40).nullable().optional(),
        displayName: z.string().trim().max(80).nullable().optional(),
      }),
    )
    .min(1)
    .max(20)
    .optional(),
  activityType: z.enum(['SCREEN', 'FIELD', 'SCREEN_AND_FIELD']),
  primaryVenueId: z.string().uuid().nullable().optional(),
  primaryVenueName: z.string().trim().max(120).nullable().optional(),
  joinMode: z.enum(['APPROVAL', 'INSTANT']),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
  primaryAgeGroup: z
    .enum(['TWENTIES', 'THIRTIES', 'FORTIES', 'FIFTIES', 'SIXTIES_PLUS'])
    .nullable()
    .optional(),
}).superRefine((data, ctx) => {
  if (!data.region?.trim() && !data.activityRegions?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'region_or_activity_regions_required',
      path: ['region'],
    });
  }
});

export type CreateClubInput = z.infer<typeof createClubSchema>;

export const clubActivityRegionSchema = z.object({
  sido: z.string().trim().min(1).max(40),
  sigungu: z.string().trim().min(1).max(40),
  parentSigungu: z.string().trim().max(40).nullable().optional(),
  displayName: z.string().trim().max(80).nullable().optional(),
});

export const updateClubSchema = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  coverImageUrl: z.string().trim().url().max(500).nullable().optional(),
  intro: z.string().trim().max(120).nullable().optional(),
  activityRegions: z.array(clubActivityRegionSchema).min(1).max(20).optional(),
  activityType: z.enum(['SCREEN', 'FIELD', 'SCREEN_AND_FIELD']).optional(),
  primaryVenueId: z.string().uuid().nullable().optional(),
  primaryVenueName: z.string().trim().max(120).nullable().optional(),
  joinMode: z.enum(['APPROVAL', 'INSTANT']).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  primaryAgeGroup: z
    .enum(['TWENTIES', 'THIRTIES', 'FORTIES', 'FIFTIES', 'SIXTIES_PLUS'])
    .nullable()
    .optional(),
});

export type UpdateClubInput = z.infer<typeof updateClubSchema>;

export const createClubEventSchema = z.object({
  title: z.string().trim().min(1).max(80),
  eventType: z.enum(['SCREEN', 'FIELD', 'OTHER']),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  venueName: z.string().trim().min(1).max(120),
  venueAddress: z.string().trim().max(200).nullable().optional(),
  venueId: z.string().uuid().nullable().optional(),
  golfFacilityId: z.string().uuid().nullable().optional(),
  capacity: z.number().int().min(1).max(200).nullable().optional(),
  responseDeadline: z.string().datetime(),
  memo: z.string().trim().max(500).nullable().optional(),
});

export type CreateClubEventInput = z.infer<typeof createClubEventSchema>;

export const updateClubEventAttendanceSchema = z.object({
  response: z.enum(['ATTENDING', 'DECLINED', 'MAYBE', 'NO_RESPONSE']).optional(),
  finalStatus: z.enum(['ATTENDED', 'NO_SHOW']).nullable().optional(),
});

export const createClubAccountingEntrySchema = z.object({
  entryType: z.enum(['INCOME', 'EXPENSE']),
  category: z.enum([
    'MEMBERSHIP_FEE',
    'JOIN_FEE',
    'PARTICIPATION_FEE',
    'DONATION',
    'OTHER_INCOME',
    'GAME_FEE',
    'MEAL',
    'PRIZE',
    'RENTAL',
    'OTHER_EXPENSE',
  ]),
  amount: z.string().trim().regex(/^\d+(\.\d{1,4})?$/),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  memo: z.string().trim().max(200).nullable().optional(),
  clubEventId: z.string().uuid().nullable().optional(),
});

export const createClubNoticeSchema = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(2000),
  pinned: z.boolean().optional(),
  sendPush: z.boolean().optional(),
});

export const updateClubAccountingEntrySchema = z.object({
  entryType: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z
    .enum([
      'MEMBERSHIP_FEE',
      'JOIN_FEE',
      'PARTICIPATION_FEE',
      'DONATION',
      'OTHER_INCOME',
      'GAME_FEE',
      'MEAL',
      'PRIZE',
      'RENTAL',
      'OTHER_EXPENSE',
    ])
    .optional(),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/)
    .optional(),
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  memo: z.string().trim().max(200).nullable().optional(),
  clubEventId: z.string().uuid().nullable().optional(),
});

export const updateClubNoticeSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  body: z.string().trim().min(1).max(2000).optional(),
  pinned: z.boolean().optional(),
});

export const createPaymentOrderSchema = z
  .object({
    productId: z.string().uuid(),
  })
  .strict();

export const confirmTossPaymentSchema = z.object({
  paymentKey: z.string().trim().min(1).max(200),
  orderId: z.string().trim().min(1).max(100),
  amount: z.number().int().positive(),
});

export const updateAdminPaymentProviderSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  environment: z.enum(['TEST', 'LIVE']).optional(),
  clientKey: z.string().trim().max(200).nullable().optional(),
  secretKey: z.string().trim().max(200).nullable().optional(),
});

const joinCreationCoinRolePolicySchema = z.object({
  enabled: z.boolean(),
  cost: z.number().int().min(0).max(1_000_000_000),
});

export const updateJoinCreationCoinPolicySchema = z.object({
  general: joinCreationCoinRolePolicySchema,
  premium: joinCreationCoinRolePolicySchema,
  storeOwner: joinCreationCoinRolePolicySchema,
});

export type UpdateJoinCreationCoinPolicyInput = z.infer<typeof updateJoinCreationCoinPolicySchema>;

export const updatePaymentProductSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(200).nullable().optional(),
  price: z.number().int().positive().optional(),
  coinAmount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/)
    .nullable()
    .optional(),
  premiumDays: z.number().int().positive().nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
