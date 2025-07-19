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
import { ApplicationService } from './application.service';
import { ClientKafka, EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { ApplicationFiltersDto } from './dto/applicationFilters.dto';
import { PaginationOptionsDto } from './dto/pagination.dto';
import {UpdateApplicationStatusDto} from './dto/update-application.dot'
import { ApplicationDocument } from './entity/application.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enums';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, ApiResponse,ApiParam, ApiQuery } from '@nestjs/swagger';


@ApiTags('Application')
@ApiBearerAuth()
@Controller('application')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}
  
  // Submit new application
  @EventPattern('job.application.submit')
  sumbitApplication(@Payload() message: any) {
    this.applicationService.sumbitApplication(message)
  }


  // GET /applications/job-offer/:jobOfferId - Applications for specific job
  @ApiParam({ name: 'jobOfferId', description: 'job offer ID', type: 'string' })
  @Get('job-offer/:jobOfferId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN,Role.EMPLOYER)
  async findAllByJobOfferId(@Param('jobOfferId') jobOfferId: string , @Query() pagination: PaginationOptionsDto) {
    return this.applicationService.findAllByJobOfferId( jobOfferId,pagination );
  }

  // GET /applications/:id - Get specific application
  
  @ApiParam({ name: 'id', description: 'application ID', type: 'string' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApplicationDocument> {
    return this.applicationService.findOne(id);
  }

  // GET /applications - Get all applications with filters
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async findAll(@Query() filters: ApplicationFiltersDto, @Query() pagination: PaginationOptionsDto) {
    return this.applicationService.findAll(filters, pagination);
  }

  // GET /applications/my-applications - User's own applications
  @Get('my-applications')
  @UseGuards(RolesGuard)
  @Roles(Role.USER)
  async findMyApplications( @Request() req: Request, @Query() pagination: PaginationOptionsDto) {
    const userId = req['user']._id;
    return this.applicationService.findAllByUserId(userId,pagination);
  }

  // DELETE /applications/:id - Withdraw application
  @ApiParam({ name: 'id', description: 'application ID', type: 'string' })
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    return this.applicationService.remove(id);
  }

  // PATCH /applications/:id/status - Update application status
  @ApiParam({ name: 'id', description: 'application ID', type: 'string' })
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  async updateStatus(@Param('id') id: string, @Body() updateApplicationStatus: UpdateApplicationStatusDto) {
    return this.applicationService.changeStatus(id, updateApplicationStatus);
  }

}
