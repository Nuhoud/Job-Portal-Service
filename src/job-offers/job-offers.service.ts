import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JobOffer, JobOfferDocument } from './entities/job-offer.entity';
import { CreateJobOfferDto } from './dto/create-job-offer.dto';
import { JobOfferFiltersDto } from './dto/jobOfferFilters.dto'
import { PaginationOptionsDto } from './dto/pagination.dto';


@Injectable()
export class JobOffersService {
  constructor(
    @InjectModel(JobOffer.name) private jobOfferModel: Model<JobOfferDocument>,
  ) {}

  //Create a new job offer
  async create(createJobOfferDto: CreateJobOfferDto, employerId: string): Promise<JobOfferDocument> {
    try {
      const jobOffer = new this.jobOfferModel({
        ...createJobOfferDto,
        employerId: new Types.ObjectId(employerId),
        postedAt: new Date(),
      });

      return await jobOffer.save();
    } catch (error) {
      throw new BadRequestException('Failed to create job offer: ' + error.message);
    }
  }

  //Find all job offers with filters and pagination
  async findAll(filters: JobOfferFiltersDto = {}, pagination: PaginationOptionsDto = {}) : 
    Promise<{ data: JobOfferDocument[]; total: number; page: number; totalPages: number; }> {

    // Destructuring pagination (with default values)
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

    const [data, total] = await Promise.all([
      this.jobOfferModel
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.jobOfferModel.countDocuments(query)
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Find all active job offers
  async findActive(
    filters: JobOfferFiltersDto = {},
    pagination: PaginationOptionsDto = {}
  ): Promise<{
    data: JobOfferDocument[];
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

  // Find job offers by employer
  async findByEmployer(
    employerId: string,
    filters: JobOfferFiltersDto = {},
    pagination: PaginationOptionsDto = {}
  ): Promise<{ data: JobOfferDocument[]; total: number; page: number; totalPages: number; } | Error> {

    try {
      const employerFilters: JobOfferFiltersDto = {
        ...filters,
        employerId,
      };
  
      return this.findAll(employerFilters, pagination);  
    }catch(error){
      throw new NotFoundException('Job offer not found');
    }
    
  }

  // Find one job offer by ID
  async findOne(id: string): Promise<JobOfferDocument> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid job offer ID');
      }
  
      const jobOffer = await this.jobOfferModel.findById(id).exec();
      
      if (!jobOffer) {
        throw new NotFoundException('Job offer not found');
      }
  
      return jobOffer;
    } catch (error) {
      throw new NotFoundException('Job offer not found');
    }
  }

  // Update a job offer
  async update(
    id: string,
    updateJobOfferDto: Partial<CreateJobOfferDto>,
    employerId: string,
    role: string,
  ): Promise<JobOfferDocument> {

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid job offer ID');
    }

    const jobOffer = await this.findOne(id);

    // Verify ownership
    if (jobOffer.employerId.toString() !== employerId || role !== 'admin') {
      throw new ForbiddenException('unauthorized access to update');
    }

    // Prevent updating expired or closed job offers
    if (jobOffer.status === 'expired' || jobOffer.status === 'closed') {
      throw new BadRequestException('Cannot update expired or closed job offers');
    }

    const updatedJobOffer = await this.jobOfferModel
      .findByIdAndUpdate(id, updateJobOfferDto, { new: true, runValidators: true })
      .exec();

    if (!updatedJobOffer) {
      throw new NotFoundException('Job offer not found');
    }

    return updatedJobOffer;
  }

  //Update job offer status
  async updateStatus(
    id: string,
    status: string,
    employerId: string,
    role:string
  ): Promise<JobOfferDocument> {

    const validStatuses = ['active', 'closed', 'expired', 'draft'];
    
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    const jobOffer = await this.findOne(id);

    // Verify ownership
    if (jobOffer.employerId.toString() !== employerId || role !== 'admin') {
      throw new ForbiddenException('unauthorized access to update');
    }

    jobOffer.status = status;
    return await jobOffer.save();
  }

  // Delete a job offer
  async remove(id: string, employerId: string, role:string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid job offer ID');
    }

    const jobOffer = await this.findOne(id);

    // Verify ownership
    if (jobOffer.employerId.toString() !== employerId || role !== 'admin') {
      throw new ForbiddenException('unauthorized access to delete job offers');
    }

    await this.jobOfferModel.findByIdAndDelete(id).exec();
  }

  // Increment applications count for a job offer
  async incrementApplicationsCount(id: string): Promise<JobOfferDocument> {
    const jobOffer = await this.findOne(id);
    
    if (jobOffer.status !== 'active') {
      throw new BadRequestException('Cannot apply to inactive job offers');
    }

    // Fixed: Use direct increment instead of calling non-existent method
    jobOffer.applicationsCount = (jobOffer.applicationsCount || 0) + 1;
    return await jobOffer.save();
  }

  // Search job offers by text
  async searchJobOffers(
    searchTerm: string,
    filters: JobOfferFiltersDto = {},
    pagination: PaginationOptionsDto = {}
  ): Promise<{
    data: JobOfferDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const searchFilters = {
      ...filters,
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

    const [data, total] = await Promise.all([
      this.jobOfferModel
        .find(searchFilters)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.jobOfferModel.countDocuments(searchFilters)
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Get job offers by location
  async findByLocation(
    location: string,
    filters: JobOfferFiltersDto = {},
    pagination: PaginationOptionsDto = {}
  ): Promise<{
    data: JobOfferDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const locationFilters: JobOfferFiltersDto = {
      ...filters,
      jobLocation: location, // Fixed: Use string instead of RegExp
      status: 'active',
    };

    return this.findAll(locationFilters, pagination);
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

    const stats = await this.jobOfferModel.aggregate([
      { $match: { employerId: employerObjectId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
          expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
          draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
          totalApplications: { $sum: '$applicationsCount' }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      active: 0,
      closed: 0,
      expired: 0,
      draft: 0,
      totalApplications: 0
    };
  }

  // Get job offers that are expiring soon (within specified days)
  async getExpiringSoon(
    employerId: string,
    days: number = 7
  ): Promise<JobOfferDocument[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.jobOfferModel
      .find({
        employerId: new Types.ObjectId(employerId),
        status: 'active',
        deadline: {
          $gte: new Date(),
          $lte: futureDate
        }
      })
      .sort({ deadline: 1 })
      .exec();
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
    const matchStage = employerId 
      ? { $match: { employerId: new Types.ObjectId(employerId) } }
      : { $match: {} };

    const analytics = await this.jobOfferModel.aggregate([
      matchStage,
      {
        $facet: {
          totalStats: [
            {
              $group: {
                _id: null,
                totalJobs: { $sum: 1 },
                activeJobs: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                totalApplications: { $sum: '$applicationsCount' },
                avgMinSalary: { $avg: '$salaryRange.min' },
                avgMaxSalary: { $avg: '$salaryRange.max' }
              }
            }
          ],
          topSkills: [
            { $unwind: '$skillsRequired' },
            {
              $group: {
                _id: '$skillsRequired',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
              $project: {
                skill: '$_id',
                count: 1,
                _id: 0
              }
            }
          ],
          jobTypeDistribution: [
            {
              $group: {
                _id: '$jobType',
                count: { $sum: 1 }
              }
            },
            {
              $project: {
                type: '$_id',
                count: 1,
                _id: 0
              }
            }
          ],
          workPlaceTypeDistribution: [
            {
              $group: {
                _id: '$workPlaceType',
                count: { $sum: 1 }
              }
            },
            {
              $project: {
                type: '$_id',
                count: 1,
                _id: 0
              }
            }
          ]
        }
      }
    ]);

    const result = analytics[0];
    
    return {
      totalJobs: result.totalStats[0]?.totalJobs || 0,
      activeJobs: result.totalStats[0]?.activeJobs || 0,
      totalApplications: result.totalStats[0]?.totalApplications || 0,
      averageSalary: {
        min: result.totalStats[0]?.avgMinSalary || 0,
        max: result.totalStats[0]?.avgMaxSalary || 0
      },
      topSkills: result.topSkills || [],
      jobTypeDistribution: result.jobTypeDistribution || [],
      workPlaceTypeDistribution: result.workPlaceTypeDistribution || []
    };
  }

  // Helper method to build filter query
  private buildFilterQuery(filters: JobOfferFiltersDto): any {
    const query: any = {};

    if (filters.workPlaceType) {
      query.workPlaceType = filters.workPlaceType;
    }

    if (filters.jobType) {
      query.jobType = filters.jobType;
    }

    if (filters.jobLocation) {
      query.jobLocation = new RegExp(filters.jobLocation, 'i');
    }

    if (filters.experienceLevel && filters.experienceLevel.length > 0) {
      query.experienceLevel = { $in: filters.experienceLevel };
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
