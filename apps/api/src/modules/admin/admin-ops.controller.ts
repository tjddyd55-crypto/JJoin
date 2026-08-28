import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JoinStatus } from '@jjoin/types';
import { AdminGuard } from '../../common/admin.guard';
import { AdminOpsService } from './admin-ops.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminOpsController {
  constructor(private readonly ops: AdminOpsService) {}

  @Get('dashboard')
  dashboard() {
    return this.ops.getDashboard();
  }

  @Get('members')
  listMembers(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ops.listMembers({
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('members/:userId')
  getMember(@Param('userId') userId: string) {
    return this.ops.getMember(userId);
  }

  @Get('joins')
  listJoins(
    @Query('q') q?: string,
    @Query('status') status?: JoinStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ops.listJoins({
      q,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('joins/:joinId')
  getJoin(@Param('joinId') joinId: string) {
    return this.ops.getJoin(joinId);
  }

  @Get('venues')
  listVenues(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ops.listVenues({
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('venues/:venueId')
  getVenue(@Param('venueId') venueId: string) {
    return this.ops.getVenue(venueId);
  }

  @Get('audit-events')
  listAudit(@Query('limit') limit?: string) {
    return this.ops.listAuditEvents({
      limit: limit ? Number(limit) : undefined,
    });
  }
}
