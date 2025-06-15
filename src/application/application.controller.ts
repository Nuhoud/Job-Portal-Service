import { Controller } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ClientKafka, EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { ApplicationFiltersDto } from './dto/applicationFilters.dto';
import { PaginationOptionsDto } from './dto/pagination.dto';

@Controller('application')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}
  
  // Submit new application
  @EventPattern('job.application.submit')
  sumbitApplication(@Payload() message: any) {
    this.applicationService.sumbitApplication(message)
  }


  // GET /applications/job-offer/:jobOfferId - Applications for specific job

  // GET /applications/:id - Get specific application

  // GET /applications - Get all applications with filters

  // GET /applications/my-applications - User's own applications

  // DELETE /applications/:id - Withdraw application

  // PATCH /applications/:id/status - Update application status

}
