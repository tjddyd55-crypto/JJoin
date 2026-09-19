import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportsService {
  // Foundation skeleton — no business implementation yet.
  // TODO(member-safety): add member/message report intake + admin review.
  // UserBlock already exists for fail-closed messaging; report UI is deferred.
  ping() {
    return { module: 'reports', status: 'skeleton' };
  }
}
