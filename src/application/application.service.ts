import { Injectable,Inject, InternalServerErrorException,NotFoundException } from '@nestjs/common';
import { ClientKafka,Payload } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Mongoose, Types } from 'mongoose';
import { ApplicationDocument,Application } from './entity/application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { JobOffersService } from '../job-offers/job-offers.service';
import { ApplicationFiltersDto } from './dto/applicationFilters.dto';
import { PaginationOptionsDto } from './dto/pagination.dto';


@Injectable()
export class ApplicationService {
    constructor(
        @InjectModel(Application.name) private ApplicationModel: Model<ApplicationDocument>,
        @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
        private jobOffersService: JobOffersService,
    ) {}

    async sumbitApplication(message: any){
        const {          
            jobOfferId,
            userId,
            employerEmail,
            userSnap
        } = message;

        this.createApplication(jobOfferId,userId,employerEmail, userSnap);
    }

    async createApplication( jobOfferId:string, userId:string,employerEmail:string, userSnap : CreateApplicationDto){
        try {
            
            const application = new this.ApplicationModel({
                jobOfferId: new Types.ObjectId(jobOfferId),
                userId: new Types.ObjectId(userId),
                employerEmail,
                userSnap
            });
            await application.save();
            // incrementApplicationsCount
            await this.jobOffersService.incrementApplicationsCount(jobOfferId);
            // maybe we can do something like push notification later
            //this.kafkaClient.emit('application_created', application);
        } catch (error) {
            throw new InternalServerErrorException('Failed to create application: ' + error.message);
        }
    }

    async findAll(pagination: PaginationOptionsDto = {}): Promise<{
        data: ApplicationDocument[];
        total: number;
        page: number;
        totalPages: number; }> 
    {
        const {
            page = 1,
            limit = 10,
            sortBy = 'postedAt',
            sortOrder = 'desc'
        } = pagination;

        const sortOptions: any = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.ApplicationModel
              .find()
              .sort(sortOptions)
              .skip(skip)
              .limit(limit)
              .exec(),
            this.ApplicationModel.countDocuments()
        ]);
        
        return {
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    // find all apllication that applied to one Job offer by the job offer id
    async findAllByJobOfferId(jobOfferId:string): Promise<ApplicationDocument[]> {
        try{
            const applications = await this.ApplicationModel.find({jobOfferId:jobOfferId}).exec();
            if(!applications){
                throw new NotFoundException('Applications not found');
            }
            return applications;
        }catch(error){
            throw new NotFoundException('Applications not found');
        }
    }

    // find all applications belongs to one user by the user id
    async findAllByUserId(userId:string): Promise<ApplicationDocument[]> {
        try{
            const applications = await this.ApplicationModel.find({userId:userId}).exec();
            if(!applications){
                throw new NotFoundException('Applications not found');
            }
            return applications;
        }catch(error){
            throw new NotFoundException('Applications not found');
        }
    }

    // find one Application Data
    async findOne(id: string): Promise<ApplicationDocument> {
        try{
            const application = await this.ApplicationModel.findById(id).exec();
            if(!application){
                throw new NotFoundException('Application not found');
            }
            return application;
        }catch(error){
            throw new NotFoundException('Application not found');
        }
    }

    async remove(id: string): Promise<void> {
        try{
            await this.ApplicationModel.findByIdAndDelete(id).exec();
        }catch(error){
            throw new NotFoundException('Application not found');
        }
    }


}
