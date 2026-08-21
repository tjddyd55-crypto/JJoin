import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { mockUserStore } from '../../mock/mock-user.store';
import { MockIdentityAdapter } from '../../providers/mock.adapters';

@Injectable()
export class IdentityService {
  constructor(private readonly identityAdapter: MockIdentityAdapter) {}

  ping() {
    return { module: 'identity', status: 'mock' };
  }

  getStatus(userId: string) {
    const me = mockUserStore.getMe(userId);
    if (!me) throw new NotFoundException('user_not_found');
    return me.identity;
  }

  async start(userId: string) {
    await this.identityAdapter.start(userId);
    return mockUserStore.startIdentity(userId);
  }

  async confirm(sessionId: string, outcome: 'success' | 'fail' = 'success') {
    if (!sessionId) throw new BadRequestException('session_required');
    // Adapter consulted for Port fidelity; store owns session state for mock.
    await this.identityAdapter.confirm(
      outcome === 'fail' ? `fail_${sessionId}` : sessionId,
    );
    try {
      return mockUserStore.confirmIdentity(sessionId, outcome);
    } catch {
      throw new BadRequestException('invalid_identity_session');
    }
  }

  cancel(sessionId: string) {
    try {
      return mockUserStore.cancelIdentity(sessionId);
    } catch {
      throw new BadRequestException('invalid_identity_session');
    }
  }
}
