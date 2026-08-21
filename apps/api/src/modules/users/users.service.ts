import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AgeBand, SportSkillLevel, SCREEN_GOLF_CODE } from '@jjoin/types';
import { profileEditSchema, profileSetupSchema, termsConsentSchema } from '@jjoin/validation';
import { mockUserStore } from '../../mock/mock-user.store';
import { MockMediaAdapter } from '../../providers/mock.adapters';

@Injectable()
export class UsersService {
  constructor(private readonly media: MockMediaAdapter) {}

  ping() {
    return { module: 'users', status: 'mock' };
  }

  getMe(userId: string) {
    const me = mockUserStore.getMe(userId);
    if (!me) throw new NotFoundException('user_not_found');
    return me;
  }

  acceptTerms(userId: string, body: unknown) {
    const parsed = termsConsentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'terms_incomplete', issues: parsed.error.issues });
    }
    return mockUserStore.acceptTerms(userId);
  }

  setupProfile(userId: string, body: unknown) {
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
      bio: data.bio || '',
      skillLevel: data.skillLevel as SportSkillLevel,
    });
  }

  editProfile(userId: string, body: unknown) {
    const parsed = profileEditSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'profile_invalid', issues: parsed.error.issues });
    }
    const data = parsed.data;
    return mockUserStore.updateProfile(userId, {
      nickname: data.nickname,
      gender: data.gender,
      ageBand: data.ageBand as AgeBand | undefined,
      regionLabel: data.regionLabel,
      bio: data.bio,
      skillLevel: data.skillLevel as SportSkillLevel | undefined,
      avatarUrl: data.avatarUrl,
    });
  }

  async setAvatar(userId: string, body: { localUri?: string | null; skip?: boolean }) {
    if (body.skip) {
      return mockUserStore.setAvatarMock(userId, `mock://avatar/default/${userId}`);
    }
    await this.media.createUploadUrl({ userId, contentType: 'image/jpeg' });
    return mockUserStore.setAvatarMock(userId, body.localUri ?? null);
  }

  getPublicProfile(userId: string) {
    const profile = mockUserStore.getPublicProfile(userId);
    if (!profile) throw new NotFoundException('user_not_found');
    return profile;
  }

  getSportProfiles(userId: string) {
    const me = this.getMe(userId);
    return me.publicProfile?.sportProfiles ?? [];
  }

  patchSportProfile(userId: string, sportCode: string, body: { skillLevel: SportSkillLevel }) {
    if (sportCode !== SCREEN_GOLF_CODE) {
      throw new BadRequestException('sport_not_supported_yet');
    }
    return mockUserStore.updateProfile(userId, { skillLevel: body.skillLevel });
  }

  getWalletSummary(userId: string) {
    return this.getMe(userId).walletSummary;
  }
}
