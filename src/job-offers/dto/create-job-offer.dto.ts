import {
    IsString, IsNotEmpty, IsArray, IsEnum, IsOptional,
    IsMongoId, ValidateNested, IsDateString, IsNumber, Min,
    IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';
  
class SalaryRangeDto {
    @IsNumber()
    @Min(0)
    min: number;

    @IsNumber()
    @Min(0)
    max: number;

    @IsEnum(['USD', 'EUR', 'SYP'])
    currency: string;
}
  
export class CreateJobOfferDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsArray()
    @IsEnum(
        ['Entry Level', 'Intership', 'Mid Level', 'Senior Level', 'Associate', 'Dirctor', 'Executive'],
        { each: true }
    )
    experienceLevel: string[];

    @IsEnum(['عن بعد', 'في الشركة', 'مزيج'])
    workPlaceType: string;

    @IsEnum(['دوام كامل', 'دوام جزئي', 'عقد', 'مستقل', 'تدريب'])
    jobType: string;

    @IsString()
    @IsNotEmpty()
    jobLocation: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsArray()
    @IsString({ each: true })
    requirements: string[];

    @IsArray()
    @IsString({ each: true })
    skillsRequired: string[];

    @ValidateNested()
    @Type(() => SalaryRangeDto)
    salaryRange: SalaryRangeDto;

    @IsDateString()
    deadline: string;
}
  