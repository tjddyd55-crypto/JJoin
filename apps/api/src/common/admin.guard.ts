import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isAdminUser } from './admin-auth';
import { mockUserStore } from '../mock/mock-user.store';
import { verifySessionToken } from '../auth/session-token';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      userId?: string;
    }>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
    let userId = mockUserStore.getUserIdByToken(token);
    if (!userId) {
      userId = verifySessionToken(token);
      if (userId && token) mockUserStore.bindToken(token, userId);
    }
    if (!userId) throw new UnauthorizedException('unauthorized');
    if (!(await isAdminUser(this.prisma, userId))) {
      throw new ForbiddenException('admin_forbidden');
    }
    req.userId = userId;
    return true;
  }
}
