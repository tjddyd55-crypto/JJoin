import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateIdentityVerificationBypassOnBoot } from './config/identity-verification';
import {
  assertProductionFailClosedOnBoot,
  resolveCorsOriginConfig,
} from './config/production-guards';

async function bootstrap() {
  validateIdentityVerificationBypassOnBoot();
  assertProductionFailClosedOnBoot();

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: resolveCorsOriginConfig(),
    credentials: false,
  });

  // Railway provides PORT; local default remains 3000 for ADB reverse flow.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  // Do not log secrets / DATABASE_URL
  console.log(`jjoin-api listening on 0.0.0.0:${port}`);
}

void bootstrap();
