/**
 * DEV-only FIELD import QA report.
 *
 *   pnpm exec tsx scripts/ops/dev-field-golf-qa-report.ts
 */
import { PrismaClient } from '@prisma/client';
import { ODCLOUD_NATIONAL_GOLF_COURSE_SOURCE } from '../../packages/domain/src/field-golf-course.ts';
import { assertDevDatabase } from '../lib/assert-dev-database.ts';

async function main() {
  assertDevDatabase('[DEV-FIELD-GOLF-QA]');
  const prisma = new PrismaClient();
  try {
    const lastRun = await prisma.publicGolfFacilitySyncRun.findFirst({
      where: { source: ODCLOUD_NATIONAL_GOLF_COURSE_SOURCE },
      orderBy: { startedAt: 'desc' },
    });
    const total = await prisma.fieldGolfCourse.count();
    const active = await prisma.fieldGolfCourse.count({ where: { isActive: true } });
    const missingName = await prisma.fieldGolfCourse.count({
      where: { name: '' },
    });
    const missingAddress = await prisma.fieldGolfCourse.count({
      where: { AND: [{ address: null }, { roadAddress: null }] },
    });
    const withCoords = await prisma.fieldGolfCourse.count({
      where: { latitude: { not: null }, longitude: { not: null } },
    });
    const sidoGroups = await prisma.fieldGolfCourse.groupBy({
      by: ['sido'],
      _count: { _all: true },
      orderBy: { sido: 'asc' },
    });
    const duplicateIds = await prisma.$queryRaw<Array<{ external_id: string; n: bigint }>>`
      SELECT external_id, COUNT(*)::bigint AS n
      FROM field_golf_courses
      GROUP BY external_source, external_id
      HAVING COUNT(*) > 1
    `;
    const duplicateNames = await prisma.$queryRaw<Array<{ k: string; n: bigint }>>`
      SELECT lower(regexp_replace(name, '\\s+', '', 'g')) || '|' ||
             lower(regexp_replace(coalesce(address, ''), '\\s+', '', 'g')) AS k,
             COUNT(*)::bigint AS n
      FROM field_golf_courses
      GROUP BY 1
      HAVING COUNT(*) > 1
    `;

    const report = {
      apiTotalCount: (lastRun?.meta as { apiTotalCount?: number } | null)?.apiTotalCount ?? null,
      lastRunStatus: lastRun?.status ?? null,
      lastFetchedCount: lastRun?.fetchedCount ?? null,
      dbCount: total,
      activeCount: active,
      missingName,
      missingAddress,
      latLngCoverage: total === 0 ? 0 : Number((withCoords / total).toFixed(4)),
      withCoords,
      sidoCounts: Object.fromEntries(sidoGroups.map((g) => [g.sido ?? '(null)', g._count._all])),
      duplicateSourceIds: duplicateIds.length,
      duplicateNameAddress: duplicateNames.length,
    };
    console.log('field_golf_qa_report', JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
