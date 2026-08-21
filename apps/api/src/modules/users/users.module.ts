import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MockMediaAdapter } from '../../providers/mock.adapters';

@Module({
  controllers: [UsersController],
  providers: [UsersService, MockMediaAdapter],
})
export class UsersModule {}
