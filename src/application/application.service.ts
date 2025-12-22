import { Injectable,Inject, InternalServerErrorException,NotFoundException, ConflictException } from '@nestjs/common';
import { ClientKafka,Payload } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Mongoose, Types } from 'mongoose';
import { ApplicationDocument,Application } from './entity/application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { JobOffersService } from '../job-offers/job-offers.service';
import { ApplicationFiltersDto } from './dto/applicationFilters.dto';
import { PaginationOptionsDto } from './dto/pagination.dto';
import {UpdateApplicationStatusDto} from './dto/update-application.dot'
import { firstValueFrom } from 'rxjs';


@Injectable()
export class ApplicationService {
    constructor(
        @InjectModel(Application.name) private ApplicationModel: Model<ApplicationDocument>,
        @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
        private jobOffersService: JobOffersService,
    ) {}

    async sendKafkaEvent( topicName:string , value :any){
        await firstValueFrom(
            this.kafkaClient.emit(topicName, {
                value
            })
        )
    }


    async sumbitApplication(message: any){
        const {          
            jobOfferId,
            userId,
            employerEmail,
            userSnap
        } = message;

        try{
            const application = await this.createApplication(jobOfferId,userId,employerEmail, userSnap);
            console.log(application);
            await this.sendKafkaEvent('job.application.created',message);
        }catch(error){
            const { reason, reasonCode } = this.getNotCreatedReason(error);
            await this.sendKafkaEvent('job.application.notcreated',{
                userId,
                jobOfferId,
                reason,
                reasonCode,
            });
            console.error('[ApplicationService] Failed to create application', error);
        }
    }


    async createApplication( jobOfferId:string, userId:string,employerEmail:string, userSnap : CreateApplicationDto): Promise<ApplicationDocument>{
        try {
            const jobOffer = await this.jobOffersService.findOne(jobOfferId);
            if(!jobOffer){
                throw new NotFoundException('no jobOffer with that id')
            }

            const existing = await this.ApplicationModel.findOne({
                jobOfferId: new Types.ObjectId(jobOfferId),
                userId: new Types.ObjectId(userId),
            }).select('_id').lean().exec();

            if(existing){
                throw new ConflictException('Application already submitted for this job');
            }
            const application = new this.ApplicationModel({
                jobOfferId: new Types.ObjectId(jobOfferId),
                userId: new Types.ObjectId(userId),
                companyName: jobOffer.companyName,
                jobTitle: jobOffer.title,
                employerEmail,
                userSnap
            });
            await application.save();
            // incrementApplicationsCount
            await this.jobOffersService.incrementApplicationsCount(jobOfferId);
            // maybe we can do something like push notification later
            //this.kafkaClient.emit('application_created', application);
            return application;
        } catch (error) {
            if(error instanceof NotFoundException || error instanceof ConflictException){
                throw error;
            }
            throw new InternalServerErrorException('Failed to create application: ' + error.message);
        }
    }

    async findAll( filters: ApplicationFiltersDto = {}, pagination: PaginationOptionsDto = {}): Promise<{
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

        // create MongoDB query based on the filters
        const query = this.buildFilterQuery(filters);


        const sortOptions: any = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (page - 1) * limit;
        try{
            const [data, total] = await Promise.all([
                this.ApplicationModel
                  .find(query)
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
        }catch(error){
            throw new InternalServerErrorException('Failed to fetch applications');
        }
    }

    // find all apllication that applied to one Job offer by the job offer id
    async findAllByJobOfferId(jobOfferId: string, pagination: PaginationOptionsDto = {},
        ): Promise<{
        data: ApplicationDocument[];
        total: number;
        page: number;
        totalPages: number;
        }> {
        const {
            page = 1,
            limit = 10,
            sortBy = 'postedAt',
            sortOrder = 'desc',
        } = pagination;

        const sortOptions: Record<string, 1 | -1> = {
            [sortBy]: sortOrder === 'desc' ? -1 : 1,
        };

        const skip = (page - 1) * limit;

        const filter = { jobOfferId };

        const [data, total] = await Promise.all([
            this.ApplicationModel.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .exec(),
            this.ApplicationModel.countDocuments(filter),
        ]);

        return {
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit) || 1, // تضمن دائمًا قيمة >= 1
        };
    }

    // find all applications belongs to one user by the user id
    async findAllByUserId(userId:string,pagination: PaginationOptionsDto = {}): Promise<{
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
        //console.log(userId);
        const sortOptions: any = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (page - 1) * limit;
        try{
            const [data, total] = await Promise.all([
                this.ApplicationModel
                  .find({userId:userId})
                  .sort(sortOptions)
                  .skip(skip)
                  .limit(limit)
                  .exec(),
                  this.ApplicationModel.countDocuments({ userId: userId })
            ]);
            //console.log(data);
            return {
                data,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            };
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


    async changeStatus(id:string, updateApplicationStatus:UpdateApplicationStatusDto){
        try{
            const application = await this.ApplicationModel.findById(id).exec();
            if(!application){
                throw new NotFoundException('Application not found');
            }
            application.status = updateApplicationStatus.status;
            application.employerNote = updateApplicationStatus.employerNote;
            await application.save();

            await this.sendKafkaEvent('job.application.statusChange', application.toObject());

            return application;
        }catch(error){
            throw new NotFoundException('Application not found');
        }
    }



    // Helper method to build filter query
    private buildFilterQuery(filters: ApplicationFiltersDto): any {
        const query: any = {};
    
        if (filters.status) {
          query.status = filters.status;
        }
        return query;
    }

    private getNotCreatedReason(error: any): { reason: string; reasonCode: string } {
        if(error instanceof ConflictException){
            return {
                reasonCode: 'already_submitted',
                reason: 'You have already submitted an application for this job.',
            };
        }
        if(error instanceof NotFoundException){
            return {
                reasonCode: 'job_offer_not_found',
                reason: 'The job offer could not be found.',
            };
        }
        return {
            reasonCode: 'create_failed',
            reason: 'Your application could not be submitted. Please try again.',
        };
    }
}
