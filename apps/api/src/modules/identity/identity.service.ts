import { Injectable } from '@nestjs/common';
import { UserAccountService } from '../users/user-account.service';

@Injectable()
export class IdentityService {
  constructor(private readonly accounts: UserAccountService) {}

  ping() {
    return { module: 'identity', status: 'ready' };
  }

  getStatus(userId: string) {
    return this.accounts.getIdentityStatus(userId);
  }

  start(userId: string) {
    return this.accounts.startIdentity(userId);
  }

  confirm(userId: string, sessionId: string, outcome: 'success' | 'fail' = 'success') {
    return this.accounts.confirmIdentity(userId, sessionId, outcome);
  }

  cancel(userId: string, sessionId: string) {
    return this.accounts.cancelIdentity(userId, sessionId);
  }
}
