import { Injectable,Inject, InternalServerErrorException,NotFoundException } from '@nestjs/common';
import { ClientKafka,Payload } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApplicationDocument,Application } from './entity/application.entity';

@Injectable()
export class ApplicationService {
    constructor(
        @InjectModel(Application.name) private userModel: Model<ApplicationDocument>,
        @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    ) {}

    async sumbitApplication(message: any){
        console.log(message);
    }


}
