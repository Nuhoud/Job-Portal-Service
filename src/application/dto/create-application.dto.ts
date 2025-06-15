import { 
    IsString, 
    IsOptional, 
    IsArray, 
    IsDateString, 
    IsEnum, 
    IsNumber, 
    IsNotEmpty,
    Min, 
    Max, 
    ValidateNested,
    ArrayMinSize,
    Length,
    IsBoolean,
    MaxLength,
    MinLength,
    IsEmail
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
  
// Basic Info DTO
export class BasicInfoDto {
    @ApiProperty({ 
        enum: ['ذكر', 'أنثى'],
        example: 'ذكر'
    })
    @IsEnum(['ذكر', 'أنثى'])
    gender: string;

    @ApiProperty({ 
        example: '2002-02-08',
        description: 'Date of birth in YYYY-MM-DD format'
    })
    @IsDateString()
    dateOfBirth: string;

    @ApiProperty({ 
        example: 'keswa, Damascus'
    })
    @IsString()
    @Length(2, 100)
    location: string;

    @ApiProperty({ 
        example: ['Arabic', 'English', 'Turkish'],
        description: 'Array of languages the user speaks'
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    languages: string[];
}

// Education DTO
export class EducationDto {
    @ApiProperty({ 
        example: "Bachelor's Degree"
    })
    @IsString()
    @Length(2, 100)
    degree: string;

    @ApiProperty({ 
        example: 'Computer Science'
    })
    @IsString()
    @Length(2, 100)
    field: string;

    @ApiProperty({ 
        example: 'Yarmok Private University'
    })
    @IsString()
    @Length(2, 200)
    university: string;

    /*   @ApiProperty({ 
        example: 2021
    })
    @IsNumber()
    @Min(1970)
    @Max(new Date().getFullYear() + 10)
    startYear: number; */

    @ApiProperty({ 
        example: 2026
    })
    @IsNumber()
    @Min(1970)
    @Max(new Date().getFullYear() + 10)
    endYear: number;

    @ApiProperty({ 
        example: 3.5,
        required: false
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(4)
    GPA?: number;
}


// Work Experience DTO
export class ExperienceDto {
    @ApiProperty({ 
        example: 'Backend Developer'
    })
    @IsString()
    @Length(2, 100)
    jobTitle: string;

    @ApiProperty({ 
        example: 'Tech Solutions GmbH'
    })
    @IsString()
    @Length(2, 100)
    company: string;

    @ApiProperty({ example: 'Aleppo, Syria', required: false })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiProperty({ 
        example: '2022-01-01',
        description: 'Start date in YYYY-MM-DD format'
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    isCurrent?: boolean;

    @ApiProperty({ 
        example: '2023-06-30',
        description: 'End date in YYYY-MM-DD format',
        required: false
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiProperty({ 
        example: 'Developed RESTful APIs and integrated MongoDB using Node.js and Express.',
        required: false
    })
    @IsOptional()
    @IsString()
    @Length(0, 1000)
    description?: string;
}


// Certifications DTO
export class CertificationDto {
    @ApiProperty({ 
        example: 'AWS Certified Cloud Practitioner'
    })
    @IsString()
    @Length(2, 200)
    name: string;

    @ApiProperty({ 
        example: 'Amazon'
    })
    @IsString()
    @Length(2, 100)
    issuer: string;

    @ApiProperty({ 
        example: '2023-01-15',
        description: 'Issue date in YYYY-MM-DD format'
    })
    @IsDateString()
    issueDate: string;
}

// Job Preferences DTO
export class JobPreferencesDto {
    @ApiProperty({ 
        enum: ['عن بعد', 'في الشركة','مزيج'],
        example: ['عن بعد', 'في الشركة'],
        isArray: true
    })
    @IsArray()
    @IsEnum(['عن بعد', 'في الشركة','مزيج'], { each: true })
    workPlaceType: string[];

    @ApiProperty({ 
        enum: ['دوام كامل', 'دوام جزئي', 'عقد', 'مستقل', 'تدريب'],
        example: ['مستقل', 'دوام كامل'],
        isArray: true
    })
    @IsArray()
    @IsEnum(['دوام كامل', 'دوام جزئي', 'عقد', 'مستقل', 'تدريب'], { each: true })
    jobType: string[];

    @ApiProperty({ 
        example: 'Germany'
    })
    @IsString()
    @Length(2, 100)
    jobLocation: string;
}


// Career Goals DTO
export class GoalsDto {
    @ApiProperty({ 
        example: 'To become a senior AI engineer specializing in NLP and infrastructure automation.'
    })
    @IsString()
    @Length(10, 1000)
    careerGoal: string;

    @ApiProperty({ 
        example: ['AI Ethics', 'Open Source Software', 'Tech for Good', 'Cloud Architecture', 'Entrepreneurship'],
        description: 'Areas of interest'
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    interests: string[];
}


// Skills DTO
export class SkillDto {
    @ApiProperty({ 
      example: 'Node.js'
    })
    @IsString()
    @Length(1, 100)
    name: string;
  
    @ApiProperty({ 
      example: 85,
      minimum: 0,
      maximum: 100,
      description: 'Skill level from 0 to 100'
    })
    @IsNumber()
    @Min(0)
    @Max(100)
    level: number;
}

export class SkillsDto {
    @ApiProperty({ 
      type: [SkillDto],
      description: 'Array of technical skills'
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SkillDto)
    technical_skills: SkillDto[];
  
    @ApiProperty({ 
      type: [SkillDto],
      description: 'Array of soft skills'
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SkillDto)
    soft_skills: SkillDto[];
}


//--------------------------------

export class CreateApplicationDto {
    @ApiProperty({
    description: 'The name of the user',
    example: 'John Doe',
    required: true,
    })
    @IsNotEmpty({ message: 'Name is required' })
    @IsString({ message: 'Name must be a string' })
    name: string;

    @ApiProperty({
    description: 'The email of the user',
    example: 'kallnaorz2@gmail.com',
    required: false,
    })
    @IsEmail({}, { message: 'Invalid email format' })
    @IsNotEmpty({ message: 'Email is required' })
    email?: string;

    @ApiProperty({
    description: 'The mobile of the user',
    example: '963936961320',
    required: false,
    })
    @IsString({ message: 'Mobile number must be a string' })
    @IsNotEmpty({ message: 'Mobile number is required' })
    @MaxLength(12, { message: 'Mobile number must be 12 characters long' })
    @MinLength(12, { message: 'Mobile number must be 12 characters long' })
    mobile?: string;

    @ApiProperty({ type: BasicInfoDto })
    @ValidateNested()
    @Type(() => BasicInfoDto)
    basicInfo?: BasicInfoDto;
  
    @ApiProperty({ type: [EducationDto] })
    @ValidateNested({ each: true })
    @Type(() => EducationDto)
    @IsArray()
    education?: EducationDto[];
  
    @ApiProperty({ type: [ExperienceDto], required: false })
    @ValidateNested({ each: true })
    @Type(() => ExperienceDto)
    @IsArray()
    @IsOptional()
    experiences?: ExperienceDto[];
  
    @ApiProperty({ type: [CertificationDto], required: false })
    @ValidateNested({ each: true })
    @Type(() => CertificationDto)
    @IsArray()
    @IsOptional()
    certifications?: CertificationDto[];
  
    @ApiProperty({ type: JobPreferencesDto, required: false })
    @ValidateNested()
    @Type(() => JobPreferencesDto)
    @IsOptional()
    jobPreferences?: JobPreferencesDto;
  
    @ApiProperty({ type: GoalsDto, required: false })
    @ValidateNested()
    @Type(() => GoalsDto)
    goals?: GoalsDto;

    @ApiProperty({ type: SkillsDto, required: false })
    @ValidateNested()
    @Type(() => SkillsDto)
    skills:SkillsDto;
}