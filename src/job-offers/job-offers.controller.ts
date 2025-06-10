import { 
  Controller, 
  Get, 
  Post, 
  Request, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  HttpStatus, 
  HttpCode,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, ApiResponse,ApiParam, ApiQuery } from '@nestjs/swagger';
import { JobOffersService } from './job-offers.service';
import { CreateJobOfferDto } from './dto/create-job-offer.dto';
import { UpdateJobOfferDto } from './dto/update-job-offer.dto';
import { JobOfferFiltersDto } from './dto/jobOfferFilters.dto';
import { PaginationOptionsDto } from './dto/pagination.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enums';
import { RolesGuard } from '../auth/guards/roles/roles.guard';



@ApiTags('JobOffer')
@ApiBearerAuth()
@Controller('job-offers')
export class JobOffersController {
  constructor(private readonly jobOffersService: JobOffersService) {}

  // Create a new job offer (Employer only) - checked 1
  @ApiBody({ type:CreateJobOfferDto , description: 'create job offer data' })
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create( @Body() createJobOfferDto: CreateJobOfferDto, @Request() req: Request ) {
    const employerId = req['user']._id;
    const companyName = req['user'].company;
    console.log
    return this.jobOffersService.create(createJobOfferDto, employerId, companyName);
  }


  // Get all job offers with filters and pagination (Public) - checked 1
  //@ApiQuery({name: 'filters',type: JobOfferFiltersDto,required: false,description: 'Filtering options for job offers'})
  //@ApiQuery({name: 'pagination',type: PaginationOptionsDto,required: false,description: 'Pagination options (page, limit)'})
  @Get()
  async findAll( @Query() filters: JobOfferFiltersDto, @Query() pagination: PaginationOptionsDto ) {
    return this.jobOffersService.findAll(filters, pagination);
  }
  

  // Get all active job offers (Public)
  @ApiQuery({name: 'filters',type: JobOfferFiltersDto,required: false,description: 'Filtering options for job offers'})
  @ApiQuery({name: 'pagination',type: PaginationOptionsDto,required: false,description: 'Pagination options (page, limit)'})
  @Get('active')
  async findActive( @Query() filters: JobOfferFiltersDto, @Query() pagination: PaginationOptionsDto) {
    return this.jobOffersService.findActive(filters, pagination);
  }


  // Get job offers by employer (Employer)
  @ApiQuery({name: 'filters',type: JobOfferFiltersDto,required: false,description: 'Filtering options for job offers'})
  @ApiQuery({name: 'pagination',type: PaginationOptionsDto,required: false,description: 'Pagination options (page, limit)'})
  @Get('employer/my-jobs')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  async findMyJobs( @Request() req: Request, @Query() filters: JobOfferFiltersDto, @Query() pagination: PaginationOptionsDto) {
    const employerId = req['user']._id;
    return this.jobOffersService.findByEmployer(employerId, filters, pagination);
  }


  // Get job offers by specific employer ID (Admin only)
  @ApiQuery({name: 'filters',type: JobOfferFiltersDto,required: false,description: 'Filtering options for job offers'})
  @ApiQuery({name: 'pagination',type: PaginationOptionsDto,required: false,description: 'Pagination options (page, limit)'})
  @ApiParam({ name: 'employerId', description: 'employer ID', type: 'string' })
  @Get('employer/:employerId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async findByEmployer( @Param('employerId') employerId: string, @Query() filters: JobOfferFiltersDto, @Query() pagination: PaginationOptionsDto ) {
    return this.jobOffersService.findByEmployer(employerId, filters, pagination);
  }


  // Search job offers by text (Public)
  @ApiQuery({name: 'filters',type: JobOfferFiltersDto,required: false,description: 'Filtering options for job offers'})
  @ApiQuery({name: 'pagination',type: PaginationOptionsDto,required: false,description: 'Pagination options (page, limit)'})
  @ApiQuery({name: 'q',type: String ,required: true,description: 'Search term'})
  @Get('search')
  async searchJobOffers( @Query('q') searchTerm: string, @Query() filters: JobOfferFiltersDto, @Query() pagination: PaginationOptionsDto ) {
    return this.jobOffersService.searchJobOffers(searchTerm, filters, pagination);
  }


  // Get employer statistics (Employer/Admin only)
  @Get('statistics/employer')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  async getMyStatistics(@Request() req: Request) {
    const employerId = req['user']._id;
    return this.jobOffersService.getEmployerStatistics(employerId);
  }

  // Get employer statistics by ID (Admin only)
  @ApiParam({ name: 'employerId', description: 'employer ID', type: 'string' })
  @Get('statistics/employer/:employerId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getEmployerStatistics(@Param('employerId') employerId: string) {
    return this.jobOffersService.getEmployerStatistics(employerId);
  }

  // Get job offers expiring soon (Employer)
  @ApiQuery({name: 'days',type: Number,required: false,description: 'number of days after'})
  @Get('expiring-soon')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  async getExpiringSoon(@Request() req: Request, @Query('days') days?: number) {
    const employerId = req['user']._id;
    return this.jobOffersService.getExpiringSoon(employerId, days);
  }

  // Get analytics (Admin only for all, Employer for own)
  @ApiQuery({name: 'employerId',type: String,required: false})
  @Get('analytics')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  async getAnalytics( @Request() req: Request,@Query('employerId') employerId?: string) {
    const userRole = req['user'].role;
    const userId = req['user']._id;
    
    // If admin and employerId provided, get analytics for that employer
    // If admin and no employerId, get global analytics
    // If employer, get own analytics only
    if (userRole === Role.ADMIN && employerId) {
      return this.jobOffersService.getAnalytics(employerId);
    } else if (userRole === Role.ADMIN && !employerId) {
      return this.jobOffersService.getAnalytics();
    } else {
      return this.jobOffersService.getAnalytics(userId);
    }
  }

  // Update expired job offers (Admin only - typically called by cron job)
  @Patch('update-expired')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async updateExpiredJobOffers() {
    const count = await this.jobOffersService.updateExpiredJobOffers();
    return { message: `Updated ${count} expired job offers` };
  }

  // Get single job offer by ID (Public)
  @ApiParam({ name: 'id', description: 'job offer ID', type: 'string' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.jobOffersService.findOne(id);
  }

  // Update job offer (Employer/Admin only)
  @ApiBody({ type:UpdateJobOfferDto , description: 'update job offer data' })
  @ApiParam({ name: 'id', description: 'job offer ID', type: 'string' })
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  async update( @Param('id') id: string, @Body() updateJobOfferDto: UpdateJobOfferDto, @Request() req: Request ) {
    const employerId = req['user']._id;
    const role = req['user'].role;
    return this.jobOffersService.update(id, updateJobOfferDto, employerId, role);
  }


  // Update job offer status (Employer/Admin only)
  @ApiParam({ name: 'id', description: 'job offer ID', type: 'string' })
  @ApiBody({ type: String , description: 'status' })
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  async updateStatus( @Param('id') id: string, @Body('status') status: string, @Request() req: Request) {
    const employerId = req['user']._id;
    const role = req['user'].role;
    return this.jobOffersService.updateStatus(id, status, employerId, role);
  }


  // Delete job offer (Employer/Admin only)
  @ApiParam({ name: 'id', description: 'job offer ID', type: 'string' })
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove( @Param('id') id: string, @Request() req: Request ) {
    const employerId = req['user']._id;
    const role = req['user'].role;
    await this.jobOffersService.remove(id, employerId, role);
  }
}