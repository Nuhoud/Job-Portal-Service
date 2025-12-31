import { Injectable, NotFoundException, BadRequestException, ForbiddenException,InternalServerErrorException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JobOffer, JobOfferDocument } from './entities/job-offer.entity';
import { CreateJobOfferDto } from './dto/create-job-offer.dto';
import { JobOfferFiltersDto } from './dto/jobOfferFilters.dto'
import { PaginationOptionsDto } from './dto/pagination.dto';
import { UpdateJobOfferDto } from './dto/update-job-offer.dto';
import { Cache } from 'cache-manager';
import { DEFAULT_CACHE_TTL_MS, jobOfferCacheKeys } from '../cache/cache.utils';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class JobOffersService {
  private readonly cacheTtlSeconds: number;

  constructor(
    @InjectModel(JobOffer.name) private jobOfferModel: Model<JobOfferDocument>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.cacheTtlSeconds = Number(
      this.configService.get('CACHE_TTL_MS') ?? DEFAULT_CACHE_TTL_MS,
    );
  }

  private async getJobOfferById(
    id: string,
    options?: { lean?: boolean },
  ): Promise<JobOfferDocument | JobOffer> {
    const query = this.jobOfferModel.findById(id);
    const jobOffer = options?.lean ? await query.lean().exec() : await query.exec();

    if (!jobOffer) {
      throw new NotFoundException('Job offer not found');
    }

    return jobOffer as JobOfferDocument | JobOffer;
  }

  private async clearJobOfferCaches(extraKeys: string[] = []) {
    const cacheAny = this.cacheManager as any;
    const store: { keys?: () => Promise<string[]> } | undefined =
      cacheAny?.store ?? cacheAny?.stores?.[0];
    const keysToClear = new Set<string>(extraKeys.filter(Boolean));

    if (store?.keys) {
      try {
        const cachedKeys = await store.keys();
        cachedKeys
          .filter((key) => key.startsWith('job-offers:'))
          .forEach((key) => keysToClear.add(key));
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

  //Create a new job offer - checked 1
  async create(createJobOfferDto: CreateJobOfferDto, employerId: string, companyName: string): Promise<JobOfferDocument> {
    try {
      const jobOffer = new this.jobOfferModel({
        ...createJobOfferDto,
        employerId: new Types.ObjectId(employerId),
        companyName,
        postedAt: new Date(),
      });

      const savedJobOffer = await jobOffer.save();
      await this.clearJobOfferCaches([
        jobOfferCacheKeys.detail(savedJobOffer._id.toString()),
      ]);

      return savedJobOffer;
    } catch (error) {
      throw new BadRequestException('Failed to create job offer: ' + error.message);
    }
  }

  //Find all job offers with filters and pagination - checked 1
  async findAll(
    filters: JobOfferFiltersDto = {},
    pagination: PaginationOptionsDto = {},
  ): Promise<{ data: JobOffer[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 10, sortBy = 'postedAt', sortOrder = 'desc' } = pagination;
    const query = this.buildFilterQuery(filters);
    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'desc' ? -1 : 1,
    };
    const skip = (page - 1) * limit;
    const cacheKey = jobOfferCacheKeys.list(query, { page, limit, sortBy, sortOrder });

    const cached = await this.cacheManager.get<{
      data: JobOffer[];
      total: number;
      page: number;
      totalPages: number;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const [data, total] = await Promise.all([
        this.jobOfferModel.find(query).sort(sortOptions).skip(skip).limit(limit).lean().exec(),
        this.jobOfferModel.countDocuments(query),
      ]);

      const payload = {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };

      await this.cacheManager.set(cacheKey, payload, this.cacheTtlSeconds);

      return payload;
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch job offers');
    }
  }

  // Find all active job offers - checked 1
  async findActive( filters: JobOfferFiltersDto = {}, pagination: PaginationOptionsDto = {}) : Promise<{
    data: JobOffer[];
    total: number;
    page: number;
    totalPages: number;
  }> {

    const activeFilters: JobOfferFiltersDto = {
      ...filters,
      status: 'active',
    };

    return this.findAll(activeFilters, pagination);
  }

  // Find job offers by employerId - checked 1
  async findByEmployer(
    employerId: string,
    filters: JobOfferFiltersDto = {},
    pagination: PaginationOptionsDto = {},
  ): Promise<{ data: JobOffer[]; total: number; page: number; totalPages: number }> {
    const employerFilters: JobOfferFiltersDto = {
      ...filters,
      employerId,
    };

    return this.findAll(employerFilters, pagination);
  }

  // Find one job offer by its ID - checked 1
  async findOne(id: string): Promise<JobOfferDocument> {
    return (await this.getJobOfferById(id)) as JobOfferDocument;
  }

  async findOnePublic(id: string): Promise<JobOffer> {
    return (await this.getJobOfferById(id, { lean: true })) as JobOffer;
  }

  // Update a job offer - checked 1
  async update(id: string,updateJobOfferDto: UpdateJobOfferDto,employerId: string,role: string,): Promise<JobOfferDocument> {
    const jobOffer = await this.findOne(id);

    // Verify ownership
    if (jobOffer.employerId.toString() !== employerId && role !== 'admin') {
      throw new ForbiddenException('unauthorized access to update');
    }

    // Prevent updating expired or closed job offers
    if (jobOffer.status === 'expired' || jobOffer.status === 'closed') {
      throw new BadRequestException('Cannot update expired or closed job offers');
    }

    try {
      const updatedJobOffer = await this.jobOfferModel
        .findByIdAndUpdate(id, updateJobOfferDto, {
          new: true,
          runValidators: true,
        })
        .exec();
    
      if (!updatedJobOffer) {
        throw new NotFoundException('Job offer not found');
      }
      await this.clearJobOfferCaches([jobOfferCacheKeys.detail(id)]);

      return updatedJobOffer;
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }
    
      throw new InternalServerErrorException('Failed to update job offer');
    }
  }

  //Update job offer status - checked 1
  async updateStatus(id: string,status: string,employerId: string,role:string): Promise<JobOfferDocument> {

    const validStatuses = ['مفتوح', 'مغلق', 'منتهي الصلاحية', 'مسودة'];
    
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    const jobOffer = await this.findOne(id);

    // Verify ownership
    if (jobOffer.employerId.toString() !== employerId && role !== 'admin') {
      throw new ForbiddenException('unauthorized access to update');
    }

    try{

      jobOffer.status = status;
      const saved = await jobOffer.save();
      await this.clearJobOfferCaches([jobOfferCacheKeys.detail(id)]);
      return saved;

    }catch(error){
      throw new InternalServerErrorException('Failed to update job offer status');
    }
  }

  // Delete a job offer - checked 1
  async remove(id: string, employerId: string, role:string): Promise<void> {

    const jobOffer = await this.findOne(id);

    // Verify ownership
    if (jobOffer.employerId.toString() !== employerId && role !== 'admin') {
      throw new ForbiddenException('unauthorized access to delete job offers');
    }

    try {
      await this.jobOfferModel.findByIdAndDelete(id).exec();
      await this.clearJobOfferCaches([jobOfferCacheKeys.detail(id)]);
    }catch(error){
      throw new InternalServerErrorException('Failed to delete job offer');
    }
  }

  // Increment applications count for a job offer - checked 1
  async incrementApplicationsCount(id: string): Promise<JobOfferDocument> {

    const jobOffer = await this.findOne(id);
    
    if (jobOffer.status !== 'مفتوح') {
      throw new BadRequestException('Cannot apply to inactive job offers');
    }

    try{
      // Fixed: Use direct increment instead of calling non-existent method
      jobOffer.applicationsCount = (jobOffer.applicationsCount || 0) + 1;
      const saved = await jobOffer.save();
      await this.clearJobOfferCaches([jobOfferCacheKeys.detail(id)]);
      return saved;
    }catch(error){
      throw new InternalServerErrorException('Failed to increment applications count');
    }
  }

  // Search job offers by text- checked 1
  async searchJobOffers(searchTerm: string, filters: JobOfferFiltersDto = {},pagination: PaginationOptionsDto = {} ): Promise<{
    data: JobOffer[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try{

/*       const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      );
*/
      //console.log(filters); 
      const query = this.buildFilterQuery(filters);

      const searchFilters = {
        ...query,
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { skillsRequired: { $in: [new RegExp(searchTerm, 'i')] } },
          { requirements: { $elemMatch: { $regex: searchTerm, $options: 'i' } } }
        ]
      };

      const {
        page = 1,
        limit = 10,
        sortBy = 'postedAt',
        sortOrder = 'desc'
      } = pagination;

      const sortOptions: any = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit;

      const cacheKey = jobOfferCacheKeys.search(searchTerm, searchFilters, {
        page,
        limit,
        sortBy,
        sortOrder,
      });

      const cached = await this.cacheManager.get<{
        data: JobOffer[];
        total: number;
        page: number;
        totalPages: number;
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      const [data, total] = await Promise.all([
        this.jobOfferModel
          .find(searchFilters)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.jobOfferModel.countDocuments(searchFilters),
      ]);

      const payload = {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };

      await this.cacheManager.set(cacheKey, payload, this.cacheTtlSeconds);

      return payload;
    }catch(error){
      console.log(error);
      throw new InternalServerErrorException('Failed to search job offers');
    }
  }


  // Get job offers statistics for an employer
  async getEmployerStatistics(employerId: string): Promise<{
    total: number;
    active: number;
    closed: number;
    expired: number;
    draft: number;
    totalApplications: number;
  }> {

    const employerObjectId = new Types.ObjectId(employerId);
    const cacheKey = jobOfferCacheKeys.stats(employerId);

    const cached = await this.cacheManager.get<{
      total: number;
      active: number;
      closed: number;
      expired: number;
      draft: number;
      totalApplications: number;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    // Use MongoDB aggregation to calculate statistics for the employer
    const stats = await this.jobOfferModel.aggregate([
      // Filter job offers by the given employerId
      { $match: { employerId: employerObjectId } },
      {
        $group: {
          _id: null, // No grouping key needed; aggregate across all matched offers
          total: { $sum: 1 }, // Total number of job offers 
          // Count of active offers
          active: { $sum: { $cond: [{ $eq: ['$status', 'مفتوح'] }, 1, 0] } },
          // Count of closed offers
          closed: { $sum: { $cond: [{ $eq: ['$status', 'مغلق'] }, 1, 0] } },
          // Count of closed offers
          expired: { $sum: { $cond: [{ $eq: ['$status', 'منتهي الصلاحية'] }, 1, 0] } },
          // Count of draft offers
          draft: { $sum: { $cond: [{ $eq: ['$status', 'مسودة'] }, 1, 0] } },
          // Sum of all applications for the employer’s offers
          totalApplications: { $sum: '$applicationsCount' }
        }
      }
    ]);
    // Return the aggregated statistics or default values if none found
    const payload =
      stats[0] || {
        total: 0,
        active: 0,
        closed: 0,
        expired: 0,
        draft: 0,
        totalApplications: 0
      };

    await this.cacheManager.set(cacheKey, payload, this.cacheTtlSeconds);
    return payload;
  }

  // Get job offers that are expiring soon (within specified days)
  async getExpiringSoon(employerId: string, days: number = 7): Promise<JobOffer[]> {
    try{
      // Create a future date X days from today
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const cacheKey = jobOfferCacheKeys.expiring(employerId, days);
      const cached = await this.cacheManager.get<JobOffer[]>(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Find job offers for the employer that are active and will expire within X days
      const jobs = await this.jobOfferModel
        .find({
          employerId: new Types.ObjectId(employerId),
          status: 'active', // Only include active job offers
          deadline: {
            $gte: new Date(), // Deadline must be today or later
            $lte: futureDate // ...but within the next X days
          }
        })
        .sort({ deadline: 1 }) // Sort offers by closest deadline first
        .lean()
        .exec();

      await this.cacheManager.set(cacheKey, jobs, this.cacheTtlSeconds);

      return jobs;
    }catch(error){
      throw new InternalServerErrorException('Failed to search job offers');
    }
  }

  // Update expired job offers
  async updateExpiredJobOffers(): Promise<number> {
    const result = await this.jobOfferModel.updateMany(
      {
        status: 'active',
        deadline: { $lt: new Date() }
      },
      { status: 'expired' }
    );

    if (result.modifiedCount > 0) {
      await this.clearJobOfferCaches();
    }

    return result.modifiedCount;
  }

 
  // Get job offers analytics
  async getAnalytics(employerId?: string): Promise<{
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    averageSalary: { min: number; max: number };
    topSkills: Array<{ skill: string; count: number }>;
    jobTypeDistribution: Array<{ type: string; count: number }>;
    workPlaceTypeDistribution: Array<{ type: string; count: number }>;
  }> {
    try {
      const matchStage = employerId
        ? { $match: { employerId: new Types.ObjectId(employerId) } }
        : { $match: {} };
      const cacheKey = jobOfferCacheKeys.analytics(employerId);

      const cached = await this.cacheManager.get<{
        totalJobs: number;
        activeJobs: number;
        totalApplications: number;
        averageSalary: { min: number; max: number };
        topSkills: Array<{ skill: string; count: number }>;
        jobTypeDistribution: Array<{ type: string; count: number }>;
        workPlaceTypeDistribution: Array<{ type: string; count: number }>;
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      const analytics = await this.jobOfferModel.aggregate([
        matchStage,
        {
          $facet: {
            totalStats: [
              {
                $group: {
                  _id: null,
                  totalJobs: { $sum: 1 },
                  activeJobs: { $sum: { $cond: [{ $eq: ['$status', '??????????'] }, 1, 0] } },
                  totalApplications: { $sum: '$applicationsCount' },
                  avgMinSalary: { $avg: '$salaryRange.min' },
                  avgMaxSalary: { $avg: '$salaryRange.max' },
                },
              },
            ],
            topSkills: [
              { $unwind: '$skillsRequired' },
              {
                $group: {
                  _id: '$skillsRequired',
                  count: { $sum: 1 },
                },
              },
              { $sort: { count: -1 } },
              { $limit: 10 },
              {
                $project: {
                  skill: '$_id',
                  count: 1,
                  _id: 0,
                },
              },
            ],
            jobTypeDistribution: [
              {
                $group: {
                  _id: '$jobType',
                  count: { $sum: 1 },
                },
              },
              {
                $project: {
                  type: '$_id',
                  count: 1,
                  _id: 0,
                },
              },
            ],
            workPlaceTypeDistribution: [
              {
                $group: {
                  _id: '$workPlaceType',
                  count: { $sum: 1 },
                },
              },
              {
                $project: {
                  type: '$_id',
                  count: 1,
                  _id: 0,
                },
              },
            ],
          },
        },
      ]);

      const result = analytics[0];
      const payload = {
        totalJobs: result.totalStats[0]?.totalJobs || 0,
        activeJobs: result.totalStats[0]?.activeJobs || 0,
        totalApplications: result.totalStats[0]?.totalApplications || 0,
        averageSalary: {
          min: result.totalStats[0]?.avgMinSalary || 0,
          max: result.totalStats[0]?.avgMaxSalary || 0,
        },
        topSkills: result.topSkills || [],
        jobTypeDistribution: result.jobTypeDistribution || [],
        workPlaceTypeDistribution: result.workPlaceTypeDistribution || [],
      };

      await this.cacheManager.set(cacheKey, payload, this.cacheTtlSeconds);
      return payload;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Failed to generate job analytics');
    }
  }

  // Helper method to build filter query
  private buildFilterQuery(filters: JobOfferFiltersDto): any {
    const query: any = {};

    if (filters.workPlaceType) {
      query.workPlaceType = filters.workPlaceType;
    }

    if (filters.companyName){
      query.companyName = filters.companyName;
    }

    if (filters.jobType) {
      query.jobType = filters.jobType;
    }

    if (filters.jobLocation) {
      query.jobLocation = new RegExp(filters.jobLocation, 'i');
    }

    if (filters.experienceLevel ) {
      query.experienceLevel = filters.experienceLevel ;
    }

    if (filters.skillsRequired && filters.skillsRequired.length > 0) {
      query.skillsRequired = { $in: filters.skillsRequired };
    }

    if (filters.salaryMin !== undefined || filters.salaryMax !== undefined) {
      query['salaryRange.min'] = {};
      query['salaryRange.max'] = {};

      if (filters.salaryMin !== undefined) {
        query['salaryRange.max'] = { $gte: filters.salaryMin };
      }

      if (filters.salaryMax !== undefined) {
        query['salaryRange.min'] = { $lte: filters.salaryMax };
      }
    }

    if (filters.currency) {
      query['salaryRange.currency'] = filters.currency;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.employerId) {
      query.employerId = new Types.ObjectId(filters.employerId);
    }

    // Always filter out inactive job offers for public queries
    if (!filters.employerId) {
      query.isActive = true;
    }

    return query;
  }
}
