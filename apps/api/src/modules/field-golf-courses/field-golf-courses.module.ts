import { Module } from '@nestjs/common';
import { FieldGolfCoursesController } from './field-golf-courses.controller';
import { FieldGolfCoursesService } from './field-golf-courses.service';

@Module({
  controllers: [FieldGolfCoursesController],
  providers: [FieldGolfCoursesService],
  exports: [FieldGolfCoursesService],
})
export class FieldGolfCoursesModule {}
