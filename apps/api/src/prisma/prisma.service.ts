import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // DB may be unavailable during foundation bootstrap; connect lazily in real flows.
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
