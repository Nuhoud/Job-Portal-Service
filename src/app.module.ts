import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobOffersModule } from './job-offers/job-offers.module';

@Module({
  imports: [JobOffersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
