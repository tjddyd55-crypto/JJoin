const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const naverCount = await prisma.socialAccount.count({ where: { provider: 'NAVER' } });
  const dupes = await prisma.$queryRaw`
    SELECT provider, provider_subject, COUNT(*)::bigint AS cnt
    FROM social_accounts
    WHERE provider = 'NAVER'
    GROUP BY provider, provider_subject
    HAVING COUNT(*) > 1
  `;
  const recent = await prisma.socialAccount.findMany({
    where: { provider: 'NAVER' },
    orderBy: { linkedAt: 'desc' },
    take: 3,
    select: { id: true, userId: true, providerSubject: true, linkedAt: true },
  });
  console.log('naver_social_account_count=', naverCount);
  console.log('duplicate_provider_subject_rows=', dupes.length);
  for (const row of recent) {
    console.log(
      JSON.stringify({
        socialAccountId: row.id,
        userId: row.userId,
        providerSubjectMasked: row.providerSubject.slice(0, 4) + '…' + row.providerSubject.slice(-4),
        linkedAt: row.linkedAt.toISOString(),
      }),
    );
  }
  if (dupes.length > 0) throw new Error('duplicate rows');
  console.log('PASS — Phase O Naver DB verify');
}

main()
  .catch((e) => {
    console.error('FAIL', e.message);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
