/**
 * DEV-only investor/demo seed + scoped reset.
 *
 *   pnpm exec tsx scripts/seed-investor-demo.ts --dry-run
 *   railway run -s api -e development -- pnpm exec tsx scripts/seed-investor-demo.ts
 *   railway run -s api -e development -- pnpm exec tsx scripts/seed-investor-demo.ts --reset
 *
 * Never run against Production. Guard fails closed.
 */
import {
  DEMO_BANNERS,
  DEMO_PERSONAS,
  DEMO_STORES,
  demoBannerTitle,
  demoClubName,
  demoEmail,
  demoProviderSubject,
} from './lib/investor-demo-catalog.ts';
import {
  INVESTOR_DEMO_TAG,
  assertInvestorDemoAllowed,
  describeDemoEnv,
  investorDemoPrismaClientOptions,
} from './lib/investor-demo-guard.ts';

type CliArgs = {
  dryRun: boolean;
  reset: boolean;
  resetOnly: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  return {
    dryRun: argv.includes('--dry-run'),
    reset: argv.includes('--reset') || argv.includes('--reset-only'),
    resetOnly: argv.includes('--reset-only'),
  };
}

function printCatalogPlan(): void {
  console.log(`${INVESTOR_DEMO_TAG} personas`);
  for (const persona of DEMO_PERSONAS) {
    console.log(
      `  - ${persona.nickname} <${demoEmail(persona.slug)}> subject=${demoProviderSubject(persona.slug)} ` +
        `attendance=${persona.attendanceDays} host=${persona.hostCompleted} play=${persona.participateCompleted}`,
    );
  }
  console.log(`${INVESTOR_DEMO_TAG} stores ${DEMO_STORES.map((row) => row.name).join(', ')}`);
  console.log(`${INVESTOR_DEMO_TAG} banners ${DEMO_BANNERS.map((row) => demoBannerTitle(row)).join(' | ')}`);
  console.log(`${INVESTOR_DEMO_TAG} club ${demoClubName()}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const env = assertInvestorDemoAllowed();
  console.log(`${INVESTOR_DEMO_TAG} guard_ok ${describeDemoEnv(env)}`);
  console.log(
    `${INVESTOR_DEMO_TAG} tx_timeout_ms=${investorDemoPrismaClientOptions().transactionOptions.timeout} ` +
      `tx_max_wait_ms=${investorDemoPrismaClientOptions().transactionOptions.maxWait}`,
  );
  printCatalogPlan();

  if (args.dryRun && !process.env.DATABASE_URL) {
    console.log(`${INVESTOR_DEMO_TAG} dry-run (no DATABASE_URL) — no writes`);
    return;
  }
  if (!process.env.DATABASE_URL) {
    throw new Error(`${INVESTOR_DEMO_TAG} DATABASE_URL required`);
  }

  const { PrismaClient } = await import('@prisma/client');
  const { collectDemoResetPlan, resetInvestorDemo } = await import('./lib/investor-demo-reset.ts');
  const { seedInvestorDemo } = await import('./lib/investor-demo-seed.ts');
  const prisma = new PrismaClient(investorDemoPrismaClientOptions());
  try {
    if (args.dryRun) {
      const plan = await collectDemoResetPlan(prisma);
      console.log(`${INVESTOR_DEMO_TAG} dry-run existing`, JSON.stringify(plan, null, 2));
      console.log(`${INVESTOR_DEMO_TAG} dry-run would ${args.resetOnly ? 'reset only' : args.reset ? 'reset then seed' : 'upsert seed'}`);
      return;
    }
    if (args.reset) {
      const deleted = await resetInvestorDemo(prisma);
      console.log(`${INVESTOR_DEMO_TAG} reset`, JSON.stringify(deleted, null, 2));
    }
    if (args.resetOnly) return;
    const summary = await seedInvestorDemo(prisma);
    console.log(`${INVESTOR_DEMO_TAG} seeded`, JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
