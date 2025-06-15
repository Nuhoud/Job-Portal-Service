// dto/update-application-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator'


export enum ApplicationStatus {
    PENDING = 'pending',
    REVIEWED = 'reviewed',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected'
}

export class UpdateApplicationStatusDto {
    @ApiProperty({ 
      description: 'New application status',
      enum: ApplicationStatus,
      example: ApplicationStatus.REVIEWED
    })
    @IsEnum(ApplicationStatus)
    status: ApplicationStatus;
  
    @ApiProperty({ 
      description: 'Optional note from employer/admin',
      example: 'Great candidate, moving to next round',
      required: false
    })
    @IsOptional()
    @IsString()
    employerNote?: string;
}