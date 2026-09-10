import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { resolveAuthenticatedUserId } from '../auth/resolve-session-user';

@Injectable()
export class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      userId?: string;
    }>();
    const userId = resolveUserIdFromAuthHeader(req.headers.authorization);
    if (!userId) {
      throw new UnauthorizedException('unauthorized');
    }
    req.userId = userId;
    return true;
  }
}

/** Sets req.userId when a valid Bearer token is present; otherwise continues anonymously. */
@Injectable()
export class OptionalMockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      userId?: string;
    }>();
    req.userId = resolveUserIdFromAuthHeader(req.headers.authorization) ?? undefined;
    return true;
  }
}

function resolveUserIdFromAuthHeader(header?: string): string | null {
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  return resolveAuthenticatedUserId(token);
}

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{ userId?: string }>();
    if (!req.userId) throw new UnauthorizedException('unauthorized');
    return req.userId;
  },
);

export const OptionalUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const req = ctx.switchToHttp().getRequest<{ userId?: string }>();
    return req.userId ?? null;
  },
);
