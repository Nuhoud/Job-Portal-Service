import { IsOptional, IsString, IsNumber, IsArray, IsEnum, IsMongoId, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class JobOfferFiltersDto {

  @ApiPropertyOptional({
    description: 'Filter by work place type',
    enum: ['عن بعد', 'في الشركة', 'مزيج'],
    example: 'عن بعد'
  })
  @IsOptional()
  @IsEnum(['عن بعد', 'في الشركة', 'مزيج'])
  workPlaceType?: string;


  @ApiPropertyOptional({
    description: 'Filter by job type',
    enum: ['دوام كامل', 'دوام جزئي', 'عقد', 'مستقل', 'تدريب'],
    example: 'دوام كامل'
  })
  @IsOptional()
  @IsEnum(['دوام كامل', 'دوام جزئي', 'عقد', 'مستقل', 'تدريب'])
  jobType?: string;


  @ApiPropertyOptional({
    description: 'Filter by job location (case-insensitive partial match)',
    example: 'Damascus'
  })
  @IsOptional()
  @IsString()
  jobLocation?: string;


  @ApiPropertyOptional({
    description: 'Filter by company Name (case-insensitive partial match)',
    example: 'Google'
  })
  @IsOptional()
  @IsString()
  companyName?: string;


  @ApiPropertyOptional({
    description: 'Filter by experience levels',
    type:String,
    enum: ['Entry Level', 'Intership', 'Mid Level', 'Senior Level', 'Associate', 'Dirctor', 'Executive'],
    example:'Senior Level'
  })
  @IsOptional()
  @IsEnum(['Entry Level', 'Intership', 'Mid Level', 'Senior Level', 'Associate', 'Dirctor', 'Executive'], { each: true })
  experienceLevel?: string;


  @ApiPropertyOptional({
    description: 'Filter by required skills',
    type: [String],
    example: ['JavaScript', 'Node.js', 'MongoDB']
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    return value;
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillsRequired?: string[];


  @ApiPropertyOptional({
    description: 'Minimum salary range',
    minimum: 0,
    example: 1000
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salaryMin?: number;

  
  @ApiPropertyOptional({
    description: 'Maximum salary range',
    minimum: 0,
    example: 5000
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salaryMax?: number;

  @ApiPropertyOptional({
    description: 'Filter by currency',
    enum: ['USD', 'EUR', 'SYP'],
    example: 'USD'
  })
  @IsOptional()
  @IsEnum(['USD', 'EUR', 'SYP'])
  currency?: string;

  @ApiPropertyOptional({
    description: 'Filter by job offer status',
    enum: ['مفتوح', 'مغلق', 'منتهي الصلاحية', 'مسودة'],
    example: 'مفتوح'
  })
  @IsOptional()
  @IsEnum(['مفتوح', 'مغلق', 'منتهي الصلاحية', 'مسودة'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by employer ID',
    example: '507f1f77bcf86cd799439011'
  })
  @IsOptional()
  @IsMongoId()
  employerId?: string;
}
