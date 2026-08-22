/**
 * Phase N Kakao DB verification — no PII / tokens in output.
 * Usage: pnpm exec tsx scripts/phase-n-kakao-db-verify.ts
 */
import { PrismaClient, SocialProvider } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const kakaoCount = await prisma.socialAccount.count({
    where: { provider: SocialProvider.KAKAO },
  });

  const dupes = await prisma.$queryRaw<Array<{ provider: string; provider_subject: string; cnt: bigint }>>`
    SELECT provider, provider_subject, COUNT(*)::bigint AS cnt
    FROM social_accounts
    WHERE provider = 'KAKAO'
    GROUP BY provider, provider_subject
    HAVING COUNT(*) > 1
  `;

  const recent = await prisma.socialAccount.findMany({
    where: { provider: SocialProvider.KAKAO },
    orderBy: { linkedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      userId: true,
      providerSubject: true,
      linkedAt: true,
      lastLoginAt: true,
      user: {
        select: {
          id: true,
          identityStatus: true,
          lastLoginAt: true,
          profile: { select: { nickname: true } },
        },
      },
    },
  });

  console.log('Phase N Kakao DB verify');
  console.log('kakao_social_account_count=', kakaoCount);
  console.log('duplicate_provider_subject_rows=', dupes.length);
  if (dupes.length > 0) {
    throw new Error('duplicate (provider, providerSubject) found');
  }

  for (const row of recent) {
    const subjectHash = row.providerSubject.slice(0, 4) + '…' + row.providerSubject.slice(-4);
    const nickMasked =
      row.user.profile?.nickname != null
        ? row.user.profile.nickname.slice(0, 2) + '…'
        : '(no profile)';
    console.log(
      JSON.stringify({
        socialAccountId: row.id,
        userId: row.userId,
        providerSubjectMasked: subjectHash,
        nicknameMasked: nickMasked,
        identityStatus: row.user.identityStatus,
        linkedAt: row.linkedAt.toISOString(),
        lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
      }),
    );
  }

  console.log('PASS — Phase N Kakao DB verify');
}

main()
  .catch((e) => {
    console.error('FAIL', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
