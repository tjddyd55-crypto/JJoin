import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { FieldGolfCoursesService } from './field-golf-courses.service';

@Controller('field-golf-courses')
export class FieldGolfCoursesController {
  constructor(private readonly service: FieldGolfCoursesService) {}

  @Get('_meta')
  meta() {
    return this.service.ping();
  }

  /** FIELD golf-course search — mobile must never call ODCloud. */
  @Get('search')
  @UseGuards(MockAuthGuard)
  search(
    @Query('name') name?: string,
    @Query('q') q?: string,
    @Query('sido') sido?: string,
    @Query('sigungu') sigungu?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.service.search({
      name: name ?? q,
      sido,
      sigungu,
      page: optionalInt(page),
      perPage: optionalInt(perPage),
    });
  }

  @Post(':id/activate-venue')
  @UseGuards(MockAuthGuard)
  activateVenue(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.service.activateVenue(userId, id);
  }
}

function optionalInt(value?: string): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : undefined;
}
