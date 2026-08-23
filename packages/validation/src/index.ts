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
});

export type RegisterPushDeviceInput = z.infer<typeof registerPushDeviceSchema>;
/** @deprecated alias — prefer registerPushDeviceSchema */
export const registerPushDeviceSchemaAlias = registerPushDeviceSchema;

export const notificationPreferenceSchema = z.object({
  pushEnabled: z.boolean(),
});

export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>;
/** @deprecated alias */
export const notificationPreferenceSchemaAlias = notificationPreferenceSchema;
