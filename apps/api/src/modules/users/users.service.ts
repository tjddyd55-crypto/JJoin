import { Injectable } from '@nestjs/common';
import { SportSkillLevel } from '@jjoin/types';
import { UserAccountService } from './user-account.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly accounts: UserAccountService,
    private readonly wallet: WalletService,
  ) {}

  ping() {
    return { module: 'users', status: 'ready' };
  }

  getMe(userId: string) {
    return this.accounts.getMe(userId);
  }

  acceptTerms(userId: string, body: unknown) {
    return this.accounts.acceptTerms(userId, body);
  }

  setupProfile(userId: string, body: unknown) {
    return this.accounts.setupProfile(userId, body);
  }

  editProfile(userId: string, body: unknown) {
    return this.accounts.editProfile(userId, body);
  }

  setAvatar(userId: string, body: { localUri?: string | null; skip?: boolean }) {
    return this.accounts.setAvatar(userId, body);
  }

  completeLocationOnboarding(userId: string) {
    return this.accounts.completeLocationOnboarding(userId);
  }

  getPublicProfile(userId: string) {
    return this.accounts.getPublicProfile(userId);
  }

  getSportProfiles(userId: string) {
    return this.getMe(userId).then((me) => me.publicProfile?.sportProfiles ?? []);
  }

  patchSportProfile(userId: string, sportCode: string, body: { skillLevel: SportSkillLevel }) {
    return this.accounts.editProfile(userId, { sportCode, skillLevel: body.skillLevel });
  }

  getWalletSummary(userId: string) {
    return this.wallet.getSummary(userId);
  }
}
