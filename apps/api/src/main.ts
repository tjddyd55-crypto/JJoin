import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateIdentityVerificationBypassOnBoot } from './config/identity-verification';

async function bootstrap() {
  validateIdentityVerificationBypassOnBoot();

  const app = await NestFactory.create(AppModule);

  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: false,
  });

  // Railway provides PORT; local default remains 3000 for ADB reverse flow.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  // Do not log secrets / DATABASE_URL
  console.log(`jjoin-api listening on 0.0.0.0:${port}`);
}

void bootstrap();
