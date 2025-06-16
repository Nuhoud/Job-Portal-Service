// dto/update-application-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator'




export class UpdateApplicationStatusDto {
    @ApiProperty({ 
      description: 'New application status',
      enum: ['قيد المراجعة', 'تمت المراجعة', 'مقبول', 'مرفوض'],
      example: 'تمت المراجعة'
    })
    @IsEnum(['قيد المراجعة', 'تمت المراجعة', 'مقبول', 'مرفوض'])
    status: string;
  
    @ApiProperty({ 
      description: 'Optional note from employer/admin',
      example: 'Great candidate, moving to next round',
      required: false
    })
    @IsOptional()
    @IsString()
    employerNote?: string;
}