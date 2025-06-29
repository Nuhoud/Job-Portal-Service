import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { Application,ApplicationSchema } from './entity/application.entity'
import { JobOffersModule } from '../job-offers/job-offers.module';
import * as dotenv from 'dotenv';
dotenv.config();
@Module({
  imports:[
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'jobportal',
            brokers: [process.env.KAFKA_URL || 'localhost:9092'],
          },
          consumer: {
            groupId: 'jobportal-consumer',
          },
        },
      },
    ]),
    MongooseModule.forFeature([{ name: Application.name, schema: ApplicationSchema }]),
    JobOffersModule,
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService],
})
export class ApplicationModule {}
