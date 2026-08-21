import { Module } from '@nestjs/common';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { MockIdentityAdapter } from '../../providers/mock.adapters';

@Module({
  controllers: [IdentityController],
  providers: [IdentityService, MockIdentityAdapter],
})
export class IdentityModule {}
