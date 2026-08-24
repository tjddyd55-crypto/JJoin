import { Injectable, NotFoundException } from '@nestjs/common';
import { mockUserStore } from '../../mock/mock-user.store';
import { UserAccountService } from '../users/user-account.service';

@Injectable()
export class IdentityService {
  constructor(private readonly accounts: UserAccountService) {}

  ping() {
    return { module: 'identity', status: 'ready' };
  }

  getStatus(userId: string) {
    if (mockUserStore.isMemoryOnlyUser(userId)) {
      const me = mockUserStore.getMe(userId);
      if (!me) throw new NotFoundException('user_not_found');
      return me.identity;
    }
    return this.accounts.getIdentityStatus(userId);
  }

  getCapability(userId: string) {
    if (mockUserStore.isMemoryOnlyUser(userId)) {
      return {
        status: 'MOCK' as const,
        canStart: true,
        message: null,
      };
    }
    return this.accounts.getIdentityCapability(userId);
  }

  start(userId: string) {
    if (mockUserStore.isMemoryOnlyUser(userId)) {
      return mockUserStore.startIdentity(userId);
    }
    return this.accounts.startIdentity(userId);
  }

  confirm(userId: string, sessionId: string, outcome: 'success' | 'fail' = 'success') {
    if (mockUserStore.isMemoryOnlyUser(userId)) {
      void userId;
      return mockUserStore.confirmIdentity(sessionId, outcome);
    }
    return this.accounts.confirmIdentity(userId, sessionId, outcome);
  }

  cancel(userId: string, sessionId: string) {
    if (mockUserStore.isMemoryOnlyUser(userId)) {
      void userId;
      return mockUserStore.cancelIdentity(sessionId);
    }
    return this.accounts.cancelIdentity(userId, sessionId);
  }
}
