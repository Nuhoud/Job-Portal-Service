import { IsOptional, IsString, IsNumber,IsIn, IsArray, IsEnum, IsMongoId, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationOptionsDto {

    // The page number
    @ApiPropertyOptional({
      description: 'Page number for pagination',
      minimum: 1,
      default: 1,
      example: 1
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;
  

    // The number of items per page
    @ApiPropertyOptional({
      description: 'Number of items per page',
      minimum: 1,
      maximum: 100,
      default: 10,
      example: 10
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 10;
    
    @ApiPropertyOptional({
      description: 'Field to sort by',
      enum: [
        'postedAt',
        'status',
        'jobTitle',
        'companyName',
        'userSnap.name',
        'userId'
      ],
      default: 'postedAt',
      example: 'postedAt',
    })
    @IsOptional()
    @IsEnum([
      'postedAt',
      'status',
      'jobTitle',
      'companyName',
      'userSnap.name',
      'userId'
    ])
    sortBy?: string = 'postedAt';
  
    @ApiPropertyOptional({
      description: 'Sort order direction',
      enum: ['asc', 'desc'],
      default: 'desc',
      example: 'desc'
    })
    @IsOptional()
    @IsEnum(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc' = 'desc';
  }
  