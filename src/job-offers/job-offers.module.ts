import { Module } from '@nestjs/common';
import { JobOffersService } from './job-offers.service';
import { JobOffersController } from './job-offers.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { JobOffer, JobOfferSchema } from './entities/job-offer.entity';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '../auth/guards/auth.guard';

@Module({
  imports:[
    MongooseModule.forFeature([{ name: JobOffer.name, schema: JobOfferSchema }]),
  ],
  controllers: [
    JobOffersController
  ],
  providers: [
    JobOffersService,
    // apply auth guard to all routes
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    }
  ],
})
export class JobOffersModule {}
