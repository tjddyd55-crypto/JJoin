import type { PrismaService } from '../prisma/prisma.service';

const ADMIN_MOCK_SUBJECT = 'dev-persona-admin';

export function parseAdminUserIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function isAdminUser(
  prisma: Pick<PrismaService, 'socialAccount' | 'adminLoginCredential'>,
  userId: string,
): Promise<boolean> {
  if (parseAdminUserIds().includes(userId)) return true;

  const credential = await prisma.adminLoginCredential.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (credential) return true;

  const socialMode = (process.env.SOCIAL_AUTH_MODE ?? 'mock').trim().toLowerCase();
  if (socialMode !== 'mock' && socialMode !== 'hybrid') return false;
  const account = await prisma.socialAccount.findFirst({
    where: { userId, providerSubject: ADMIN_MOCK_SUBJECT },
  });
  return Boolean(account);
}

export { ADMIN_MOCK_SUBJECT };
