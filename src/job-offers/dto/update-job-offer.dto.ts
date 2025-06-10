import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateJobOfferDto } from './create-job-offer.dto';
import {IsEnum} from 'class-validator'

export class UpdateJobOfferDto extends PartialType(CreateJobOfferDto) {}

export class UpdateJobStatusDto {
    @ApiProperty({
      enum: ['active', 'closed', 'expired', 'draft'],
      description: 'The new status for the job offer',
      example: 'closed'
    })
    @IsEnum(['active', 'closed', 'expired', 'draft'], {
      message: 'Invalid status value'
    })
    status: string;
  }