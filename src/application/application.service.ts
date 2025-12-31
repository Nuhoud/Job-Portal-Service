import { Injectable,Inject, InternalServerErrorException,NotFoundException, ConflictException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ClientKafka,Payload } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApplicationDocument,Application } from './entity/application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { JobOffersService } from '../job-offers/job-offers.service';
import { ApplicationFiltersDto } from './dto/applicationFilters.dto';
import { PaginationOptionsDto } from './dto/pagination.dto';
import {UpdateApplicationStatusDto} from './dto/update-application.dot'
import { firstValueFrom } from 'rxjs';
import { JobOfferDocument } from '../job-offers/entities/job-offer.entity';
import { Cache } from 'cache-manager';
import { applicationCacheKeys, DEFAULT_CACHE_TTL_MS } from '../cache/cache.utils';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class ApplicationService {
    private readonly cacheTtlSeconds: number;

    constructor(
        @InjectModel(Application.name) private ApplicationModel: Model<ApplicationDocument>,
        @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
        private jobOffersService: JobOffersService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
        private readonly configService: ConfigService,
    ) {
        this.cacheTtlSeconds = Number(
            this.configService.get('CACHE_TTL_MS') ?? DEFAULT_CACHE_TTL_MS,
        );
    }

    private async clearApplicationCaches(extraKeys: string[] = []) {
        const cacheAny = this.cacheManager as any;
        const store: { keys?: () => Promise<string[]> } | undefined =
            cacheAny?.store ?? cacheAny?.stores?.[0];
        const keysToClear = new Set<string>(extraKeys.filter(Boolean));

        if (store?.keys) {
            try {
                const cachedKeys = await store.keys();
                cachedKeys
                    .filter((key: string) => key.startsWith('applications:'))
                    .forEach((key: string) => keysToClear.add(key));
            } catch {
                // ignore key enumeration errors
            }
        }

        if (keysToClear.size === 0) {
            await this.cacheManager.clear();
            return;
        }

        await Promise.all(Array.from(keysToClear).map((key) => this.cacheManager.del(key)));
    }

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
            const { application, jobOffer } = await this.createApplication(jobOfferId,userId,employerEmail, userSnap);
            console.log(application);
            const createdPayload = {
                jobOfferId,
                userId,
                employerEmail,
                employerId: jobOffer.employerId?.toString?.() ?? jobOffer.employerId,
                companyName: jobOffer.companyName,
                jobTitle: jobOffer.title,
                userSnap,
            };
            await this.sendKafkaEvent('job.application.created',createdPayload);
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


    async createApplication( jobOfferId:string, userId:string,employerEmail:string, userSnap : CreateApplicationDto): Promise<{ application: ApplicationDocument; jobOffer: JobOfferDocument }>{
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
            await this.clearApplicationCaches();
            // incrementApplicationsCount
            await this.jobOffersService.incrementApplicationsCount(jobOfferId);
            // maybe we can do something like push notification later
            //this.kafkaClient.emit('application_created', application);
            return { application, jobOffer };
        } catch (error) {
            if(error instanceof NotFoundException || error instanceof ConflictException){
                throw error;
            }
            throw new InternalServerErrorException('Failed to create application: ' + error.message);
        }
    }

    async findAll( filters: ApplicationFiltersDto = {}, pagination: PaginationOptionsDto = {}): Promise<{
        data: Application[];
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

        const query = this.buildFilterQuery(filters);
        const sortOptions: Record<string, 1 | -1> = {
            [sortBy]: sortOrder === 'desc' ? -1 : 1,
        };
        const skip = (page - 1) * limit;
        const cacheKey = applicationCacheKeys.list(query, { page, limit, sortBy, sortOrder });

        const cached = await this.cacheManager.get<{
            data: Application[];
            total: number;
            page: number;
            totalPages: number;
        }>(cacheKey);
        if (cached) {
            return cached;
        }

        try{
            const [data, total] = await Promise.all([
                this.ApplicationModel
                  .find(query)
                  .sort(sortOptions)
                  .skip(skip)
                  .limit(limit)
                  .lean()
                  .exec(),
                this.ApplicationModel.countDocuments(query)
            ]);
            
            const payload = {
                data,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            };

            await this.cacheManager.set(cacheKey, payload, this.cacheTtlSeconds);
            return payload;
        }catch(error){
            throw new InternalServerErrorException('Failed to fetch applications');
        }
    }

    // find all apllication that applied to one Job offer by the job offer id
    async findAllByJobOfferId(jobOfferId: string, pagination: PaginationOptionsDto = {},
        ): Promise<{
        data: Application[];
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
        const cacheKey = applicationCacheKeys.byJob(jobOfferId, { page, limit, sortBy, sortOrder });
        const cached = await this.cacheManager.get<{
            data: Application[];
            total: number;
            page: number;
            totalPages: number;
        }>(cacheKey);
        if (cached) {
            return cached;
        }

        const filter = { jobOfferId };

        const [data, total] = await Promise.all([
            this.ApplicationModel.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean()
            .exec(),
            this.ApplicationModel.countDocuments(filter),
        ]);

        const payload = {
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit) || 1,
        };

        await this.cacheManager.set(cacheKey, payload, this.cacheTtlSeconds);
        return payload;
    }

    // find all applications belongs to one user by the user id
    async findAllByUserId(userId:string,pagination: PaginationOptionsDto = {}): Promise<{
        data: Application[];
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
        const sortOptions: Record<string, 1 | -1> = {
            [sortBy]: sortOrder === 'desc' ? -1 : 1,
        };

        const skip = (page - 1) * limit;
        const cacheKey = applicationCacheKeys.byUser(userId, { page, limit, sortBy, sortOrder });
        const cached = await this.cacheManager.get<{
            data: Application[];
            total: number;
            page: number;
            totalPages: number;
        }>(cacheKey);
        if (cached) {
            return cached;
        }

        try{
            const filter = { userId: userId };
            const [data, total] = await Promise.all([
                this.ApplicationModel
                  .find(filter)
                  .sort(sortOptions)
                  .skip(skip)
                  .limit(limit)
                  .lean()
                  .exec(),
                  this.ApplicationModel.countDocuments(filter)
            ]);
            const payload = {
                data,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            };
            await this.cacheManager.set(cacheKey, payload, this.cacheTtlSeconds);
            return payload;
        }catch(error){
            throw new NotFoundException('Applications not found');
        }
    }

    // find one Application Data
    async findOne(id: string): Promise<Application> {
        const cacheKey = applicationCacheKeys.detail(id);
        const cached = await this.cacheManager.get<Application>(cacheKey);
        if (cached) {
            return cached;
        }

        try{
            const application = await this.ApplicationModel.findById(id).lean().exec();
            if(!application){
                throw new NotFoundException('Application not found');
            }
            await this.cacheManager.set(cacheKey, application, this.cacheTtlSeconds);
            return application as Application;
        }catch(error){
            throw new NotFoundException('Application not found');
        }
    }

    async remove(id: string): Promise<void> {
        try{
            await this.ApplicationModel.findByIdAndDelete(id).exec();
            await this.clearApplicationCaches([applicationCacheKeys.detail(id)]);
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
            await this.clearApplicationCaches([applicationCacheKeys.detail(id)]);

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
