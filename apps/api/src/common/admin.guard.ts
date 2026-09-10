import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isAdminUser } from './admin-auth';
import { resolveAuthenticatedUserId } from '../auth/resolve-session-user';

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
    const userId = resolveAuthenticatedUserId(token);
    if (!userId) throw new UnauthorizedException('unauthorized');
    if (!(await isAdminUser(this.prisma, userId))) {
      throw new ForbiddenException('admin_forbidden');
    }
    req.userId = userId;
    return true;
  }
}
