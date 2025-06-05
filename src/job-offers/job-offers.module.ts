import { Module } from '@nestjs/common';
import { JobOffersService } from './job-offers.service';
import { JobOffersController } from './job-offers.controller';

@Module({
  controllers: [JobOffersController],
  providers: [JobOffersService],
})
export class JobOffersModule {}
