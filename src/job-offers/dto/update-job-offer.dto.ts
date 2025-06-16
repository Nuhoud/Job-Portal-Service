import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateJobOfferDto } from './create-job-offer.dto';
import {IsEnum} from 'class-validator'

export class UpdateJobOfferDto extends PartialType(CreateJobOfferDto) {}

export class UpdateJobStatusDto {
    @ApiProperty({
      enum: ['مفتوح', 'مغلق', 'منتهي الصلاحية', 'مسودة'],
      description: 'The new status for the job offer',
      example: 'مفتوح'
    })
    @IsEnum(['مفتوح', 'مغلق', 'منتهي الصلاحية', 'مسودة'], {
      message: 'Invalid status value'
    })
    status: string;
  }