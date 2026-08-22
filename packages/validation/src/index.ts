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

export const createJoinSchema = z.object({
  sportCode: z.string().trim().min(1).default('SCREEN_GOLF'),
  venue: z.object({
    provider: z.string().trim().min(1),
    providerPlaceId: z.string().trim().min(1),
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().max(200).nullable().optional(),
    regionLabel: z.string().trim().max(80).nullable().optional(),
    latitude: z.number().finite().gte(-90).lte(90),
    longitude: z.number().finite().gte(-180).lte(180),
  }),
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
