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
