import { IsOptional, IsString, IsNumber, IsArray, IsEnum, IsMongoId, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional,ApiProperty } from '@nestjs/swagger';



export class ApplicationFiltersDto {

  @ApiProperty({ 
    description: 'filter by application status',
    enum: ['قيد المراجعة', 'تمت المراجعة', 'مقبول', 'مرفوض'],
    example: 'قيد المراجعة'
  })
  @IsEnum(['قيد المراجعة', 'تمت المراجعة', 'مقبول', 'مرفوض'])
  status?: string;
  
}
