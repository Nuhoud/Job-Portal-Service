import { IsOptional, IsString, IsNumber, IsArray, IsEnum, IsMongoId, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional,ApiProperty } from '@nestjs/swagger';

export enum ApplicationStatus {
    PENDING = 'pending',
    REVIEWED = 'reviewed',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected'
}

export class ApplicationFiltersDto {

  @ApiProperty({ 
    description: 'filter by application status',
    enum: ApplicationStatus,
    example: ApplicationStatus.REVIEWED
  })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}
