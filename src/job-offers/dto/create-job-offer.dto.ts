import {
    IsString, IsNotEmpty, IsArray, IsEnum, IsOptional,
    IsMongoId, ValidateNested, IsDateString, IsNumber, Min,
    IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Enums for better type safety and reusability
export enum ExperienceLevel {
    ENTRY_LEVEL = 'Entry Level',
    INTERNSHIP = 'Internship', // Fixed typo
    MID_LEVEL = 'Mid Level',
    SENIOR_LEVEL = 'Senior Level',
    ASSOCIATE = 'Associate',
    DIRECTOR = 'Director', // Fixed typo
    EXECUTIVE = 'Executive'
}

export enum WorkPlaceType {
    REMOTE = 'عن بعد',
    ON_SITE = 'في الشركة',
    HYBRID = 'مزيج'
}

export enum JobType {
    FULL_TIME = 'دوام كامل',
    PART_TIME = 'دوام جزئي',
    CONTRACT = 'عقد',
    FREELANCE = 'مستقل',
    INTERNSHIP = 'تدريب'
}

export enum Currency {
    USD = 'USD',
    EUR = 'EUR',
    SYP = 'SYP'
}

export class SalaryRangeDto {
    @ApiProperty({
        description: 'Minimum salary amount',
        example: 50000,
        minimum: 0,
        type: 'number'
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0, { message: 'Minimum salary must be greater than or equal to 0' })
    min: number;

    @ApiProperty({
        description: 'Maximum salary amount',
        example: 100000,
        minimum: 0,
        type: 'number'
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0, { message: 'Maximum salary must be greater than or equal to 0' })
    max: number;

    @ApiProperty({
        description: 'Salary currency',
        enum: Currency,
        enumName: 'Currency',
        example: Currency.SYP,
        default: Currency.SYP
    })
    @IsEnum(Currency, { message: 'Currency must be one of: USD, EUR, SYP' })
    currency: Currency;
}

export class CreateJobOfferDto {
    @ApiProperty({
        description: 'Job position title',
        example: 'Senior Software Engineer',
        minLength: 1,
        maxLength: 100,
        type: 'string'
    })
    @IsString({ message: 'Title must be a string' })
    @IsNotEmpty({ message: 'Title is required' })
    title: string;

    @ApiProperty({
        description: 'Required experience levels for the position',
        enum: ExperienceLevel,
        enumName: 'ExperienceLevel',
        isArray: true,
        example: [ExperienceLevel.MID_LEVEL, ExperienceLevel.SENIOR_LEVEL],
        type: [String]
    })
    @IsArray({ message: 'Experience level must be an array' })
    @IsEnum(ExperienceLevel, { 
        each: true, 
        message: 'Each experience level must be valid' 
    })
    experienceLevel: ExperienceLevel[];

    @ApiProperty({
        description: 'Work arrangement type',
        enum: WorkPlaceType,
        enumName: 'WorkPlaceType',
        example: WorkPlaceType.HYBRID
    })
    @IsEnum(WorkPlaceType, { 
        message: 'Work place type must be one of: Remote, On-site, or Hybrid' 
    })
    workPlaceType: WorkPlaceType;

    @ApiProperty({
        description: 'Employment type',
        enum: JobType,
        enumName: 'JobType',
        example: JobType.FULL_TIME
    })
    @IsEnum(JobType, { 
        message: 'Job type must be one of the valid employment types' 
    })
    jobType: JobType;

    @ApiProperty({
        description: 'Primary work location or city',
        example: 'Damascus, Syria',
        minLength: 1,
        maxLength: 100,
        type: 'string'
    })
    @IsString({ message: 'Job location must be a string' })
    @IsNotEmpty({ message: 'Job location is required' })
    jobLocation: string;

    @ApiProperty({
        description: 'Detailed job description and responsibilities',
        example: 'We are looking for a skilled software engineer to join our team...',
        minLength: 10,
        maxLength: 5000,
        type: 'string'
    })
    @IsString({ message: 'Description must be a string' })
    @IsNotEmpty({ message: 'Job description is required' })
    description: string;

    @ApiProperty({
        description: 'List of job requirements and qualifications',
        example: [
            'Bachelor\'s degree in Computer Science or related field',
            'Minimum 3 years of experience in software development',
            'Strong problem-solving skills'
        ],
        type: [String],
        isArray: true
    })
    @IsArray({ message: 'Requirements must be an array' })
    @IsString({ each: true, message: 'Each requirement must be a string' })
    @IsNotEmpty({ message: 'At least one requirement is needed' })
    requirements: string[];

    @ApiProperty({
        description: 'Technical skills and competencies required',
        example: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'MongoDB'],
        type: [String],
        isArray: true
    })
    @IsArray({ message: 'Skills required must be an array' })
    @IsString({ each: true, message: 'Each skill must be a string' })
    @IsNotEmpty({ message: 'At least one skill is required' })
    skillsRequired: string[];

    @ApiProperty({
        description: 'Salary range information',
        type: SalaryRangeDto,
        required: true
    })
    @ValidateNested({ message: 'Salary range must be valid' })
    @Type(() => SalaryRangeDto)
    @IsNotEmpty({ message: 'Salary range is required' })
    salaryRange: SalaryRangeDto;

    @ApiProperty({
        description: 'Application deadline date',
        example: '2024-12-31T23:59:59.000Z',
        type: 'string',
        format: 'date-time'
    })
    @IsDateString({}, { message: 'Deadline must be a valid ISO date string' })
    @IsNotEmpty({ message: 'Application deadline is required' })
    deadline: string;
}