import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AgeBand, SportSkillLevel, type MeDto } from '@jjoin/types';
import { profileSetupSchema, termsConsentSchema } from '@jjoin/validation';
import { mockUserStore } from '../../mock/mock-user.store';
import { UserAccountService } from './user-account.service';
import { WalletService } from '../wallet/wallet.service';

/**
 * Users facade — DB-backed accounts first.
 * Pure in-memory mock users (mock-sign-in) use MockUserStore so local
 * onboarding QA works without a second auth architecture.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly accounts: UserAccountService,
    private readonly wallet: WalletService,
  ) {}

  ping() {
    return { module: 'users', status: 'ready' };
  }

  async getMe(userId: string): Promise<MeDto> {
    if (mockUserStore.isMemoryOnlyUser(userId)) {
      const me = mockUserStore.getMe(userId);
      if (!me) throw new NotFoundException('user_not_found');
      return me;
    }
    return this.accounts.getMe(userId);
  }

  async acceptTerms(userId: string, body: unknown): Promise<MeDto> {
    if (mockUserStore.isMemoryOnlyUser(userId)) {
      const parsed = termsConsentSchema.safeParse(body);
      if (!parsed.success) {
        throw new BadRequestException({ code: 'terms_incomplete', issues: parsed.error.issues });
      }
      return mockUserStore.acceptTerms(userId);
    }
    return this.accounts.acceptTerms(userId, body);
  }

  async setupProfile(userId: string, body: unknown): Promise<MeDto> {
    if (mockUserStore.isMemoryOnlyUser(userId)) {
      const parsed = profileSetupSchema.safeParse(body);
      if (!parsed.success) {
        throw new BadRequestException({ code: 'profile_invalid', issues: parsed.error.issues });
      }
      const data = parsed.data;
      return mockUserStore.updateProfile(userId, {
        nickname: data.nickname,
        gender: data.gender,
        ageBand: data.ageBand as AgeBand,
        regionLabel: data.regionLabel,
        bio: data.bio,
        skillLevel: data.skillLevel as SportSkillLevel,
      });
    }
    return this.accounts.setupProfile(userId, body);
  }

  editProfile(userId: string, body: unknown) {
    if (mockUserStore.isMemoryOnlyUser(userId)) {
      return this.setupProfile(userId, body);
    }
    return this.accounts.editProfile(userId, body);
  }

  async setAvatar(
    userId: string,
    body: { localUri?: string | null; skip?: boolean },
  ): Promise<MeDto> {
    if (mockUserStore.isMemoryOnlyUser(userId)) {
      return mockUserStore.setAvatarMock(userId, body.localUri ?? null, Boolean(body.skip));
    }
    return this.accounts.setAvatar(userId, body);
  }

  async completeLocationOnboarding(userId: string): Promise<MeDto> {
    if (mockUserStore.isMemoryOnlyUser(userId)) {
      return mockUserStore.completeLocationOnboarding(userId);
    }
    return this.accounts.completeLocationOnboarding(userId);
  }

  async getPublicProfile(userId: string, viewerUserId?: string | null) {
    if (mockUserStore.isMemoryOnlyUser(userId)) {
      const profile = mockUserStore.getPublicProfile(userId);
      if (!profile) throw new NotFoundException('user_not_found');
      return profile;
    }
    return this.accounts.getPublicProfile(userId, viewerUserId);
  }

  getSportProfiles(userId: string) {
    return this.getMe(userId).then((me) => me.publicProfile?.sportProfiles ?? []);
  }

  patchSportProfile(userId: string, sportCode: string, body: { skillLevel: SportSkillLevel }) {
    return this.editProfile(userId, { sportCode, skillLevel: body.skillLevel });
  }

  getWalletSummary(userId: string) {
    if (mockUserStore.isMemoryOnlyUser(userId)) {
      const me = mockUserStore.getMe(userId);
      if (!me) throw new NotFoundException('user_not_found');
      return Promise.resolve(me.walletSummary);
    }
    return this.wallet.getSummary(userId);
  }
}
