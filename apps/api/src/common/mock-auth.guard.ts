import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { mockUserStore } from '../mock/mock-user.store';
import { verifySessionToken } from '../auth/session-token';

@Injectable()
export class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      userId?: string;
    }>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
    let userId = mockUserStore.getUserIdByToken(token);
    if (!userId) {
      userId = verifySessionToken(token);
      if (userId && token) {
        mockUserStore.bindToken(token, userId);
      }
    }
    if (!userId) {
      throw new UnauthorizedException('unauthorized');
    }
    req.userId = userId;
    return true;
  }
}

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{ userId?: string }>();
    if (!req.userId) throw new UnauthorizedException('unauthorized');
    return req.userId;
  },
);
