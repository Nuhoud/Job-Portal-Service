import { Controller } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ClientKafka, EventPattern, MessagePattern, Payload } from '@nestjs/microservices';

@Controller('application')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}
  
  
  @EventPattern('job.application.submit')
  sumbitApplication(@Payload() message: any) {
    this.applicationService.sumbitApplication(message)
  }
  

}
