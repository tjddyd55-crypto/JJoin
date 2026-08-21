import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { MemoryPresenceStore } from './memory-presence.store';
import { PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';
import { resolvePresenceStoreMode } from './presence.config';
import { PRESENCE_STORE } from './presence.store';
import { PrismaPresenceStore } from './prisma-presence.store';

@Module({
  imports: [PrismaModule],
  controllers: [PresenceController],
  providers: [
    {
      provide: PRESENCE_STORE,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => {
        const mode = resolvePresenceStoreMode();
        if (mode === 'memory') {
          return new MemoryPresenceStore();
        }
        return new PrismaPresenceStore(prisma);
      },
    },
    PresenceService,
  ],
  exports: [PresenceService],
})
export class PresenceModule {}
