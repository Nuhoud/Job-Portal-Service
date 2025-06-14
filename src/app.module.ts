import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobOffersModule } from './job-offers/job-offers.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ApplicationModule } from './application/application.module';
import * as dotenv from 'dotenv';
dotenv.config();


@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    MongooseModule.forRoot('mongodb://localhost:27017/nuhoudJobs'),
    JobOffersModule,
    // Load environment variables from the `.env` file and make ConfigService globally available across the entire application
    ConfigModule.forRoot({isGlobal: true}),
    ApplicationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
